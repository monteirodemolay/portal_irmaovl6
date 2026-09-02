'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import {
  BRAZIL_TIME_ZONE,
  errorToLogContext,
  eventSchema,
  logger,
  parseBrazilDateTimeLocal,
  type SessionAccessKind,
  type SessionType,
  type SessionWorkDegree,
} from '@vl6/shared';
import type { AttendanceResponse, Event } from '@vl6/domain';
import { createServerContainer, type ServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import {
  resolveArchiveItem,
  type ResolvedArchiveItem,
} from '@/modules/archive/lib/resolve-archive-item';
import { parseArchiveItemId } from '@/modules/archive/lib/archive-item-id';
import { notifyAllActiveUsers } from '@/modules/notification/lib/notify-all-active-users';

export interface AgendaActionState {
  error: string | null;
}

/**
 * Fan-out "Agenda da Loja → Google Agenda" — dispara ao criar/editar um
 * evento VL6, mas nunca pode impedir a criação/edição em si: uma falha aqui
 * (token expirado, API do Google fora do ar) só é registrada em
 * observabilidade, nunca propagada pro admin que só queria salvar o evento.
 */
async function syncEventToConnectedGoogleCalendars(
  container: ServerContainer,
  tenantId: string,
  event: Event,
): Promise<void> {
  try {
    const { failedUserIds } = await container.useCases.syncVl6EventToAllConnectedUsers.execute(
      tenantId,
      event,
    );
    if (failedUserIds.length > 0) {
      logger.error('Falha ao sincronizar evento VL6 com o Google Agenda de alguns Irmãos', {
        route: 'syncEventToConnectedGoogleCalendars',
        eventId: event.id,
        failedUserIds,
      });
    }
  } catch (error) {
    logger.error('Falha inesperada no fan-out Loja → Google Agenda', {
      route: 'syncEventToConnectedGoogleCalendars',
      eventId: event.id,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, {
      tags: { route: 'syncEventToConnectedGoogleCalendars', eventId: event.id },
    });
  }
}

/**
 * Avisa (notificação interna) cada Irmão com a Agenda da Loja sincronizada
 * ao Google sempre que um evento é criado — mesma proteção do fan-out
 * acima: nunca pode impedir a criação do evento em si.
 */
async function notifyConnectedUsersOfNewEvent(
  container: ServerContainer,
  tenantId: string,
  event: Event,
): Promise<void> {
  try {
    await container.useCases.notifyConnectedUsersOfNewVl6Event.execute(tenantId, event);
  } catch (error) {
    logger.error('Falha inesperada ao notificar Irmãos sobre novo evento VL6', {
      route: 'notifyConnectedUsersOfNewEvent',
      eventId: event.id,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, {
      tags: { route: 'notifyConnectedUsersOfNewEvent', eventId: event.id },
    });
  }
}

function formatEventDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
}

/**
 * Gatilhos imediatos da Central de Avisos (docs/architecture) — sempre
 * roda DEPOIS que `createEvent`/`updateEvent`/`deleteEvent` já teve
 * sucesso, nunca impede a ação em si. Audiência: todos os usuários ativos
 * do tenant — diferente do fan-out específico do Google Agenda acima
 * (`notifyConnectedUsersOfNewEvent`), que só alcança quem sincronizou.
 */
async function notifyEventCreated(
  container: ServerContainer,
  tenantId: string,
  event: Event,
): Promise<void> {
  await notifyAllActiveUsers(container, tenantId, {
    tipo: 'event',
    titulo: `Nova Sessão: ${event.titulo}`,
    mensagem: `${formatEventDateTime(event.dataInicio)} · ${event.local}`,
    link: '/agenda',
  });
}

async function notifyEventRescheduled(
  container: ServerContainer,
  tenantId: string,
  before: Event,
  after: Event,
): Promise<void> {
  const changedDate = before.dataInicio.getTime() !== after.dataInicio.getTime();
  const changedLocal = before.local !== after.local;
  if (!changedDate && !changedLocal) return;

  await notifyAllActiveUsers(container, tenantId, {
    tipo: 'event',
    titulo: `Alteração na Sessão: ${after.titulo}`,
    mensagem: `Nova data/local: ${formatEventDateTime(after.dataInicio)} · ${after.local}`,
    link: '/agenda',
    priority: 'attention',
  });
}

async function notifyEventCancelled(
  container: ServerContainer,
  tenantId: string,
  event: Event,
): Promise<void> {
  await notifyAllActiveUsers(container, tenantId, {
    tipo: 'event',
    titulo: `Sessão cancelada: ${event.titulo}`,
    mensagem: `Estava marcada para ${formatEventDateTime(event.dataInicio)} · ${event.local}.`,
    link: '/agenda',
    priority: 'urgent',
  });
}

function parseEventForm(formData: FormData) {
  const capacidadeMaxima = formData.get('capacidadeMaxima');
  const dataInicioRaw = formData.get('dataInicio');
  const dataFimRaw = formData.get('dataFim');
  const tipo = formData.get('tipo');
  const isSessao = tipo === 'sessao';

  // Campos de classificação da Sessão só existem no formulário quando
  // `tipo === 'sessao'` (ver `EventForm`) — fora disso ficam sempre `null`,
  // nunca herdados de um envio anterior.
  const isJointSession = isSessao && formData.get('isJointSession') === 'on';
  const lodgeNomes = formData.getAll('lodgeNome').map(String);
  const lodgeNumeros = formData.getAll('lodgeNumero').map(String);
  const lodgeOrientes = formData.getAll('lodgeOriente').map(String);
  const lodgePotencias = formData.getAll('lodgePotencia').map(String);
  const lodgeObservacoes = formData.getAll('lodgeObservacao').map(String);
  const participatingLodges = isJointSession
    ? lodgeNomes
        .map((nome, index) => ({
          nome,
          numero: lodgeNumeros[index] || null,
          oriente: lodgeOrientes[index] || null,
          potencia: lodgePotencias[index] || null,
          observacao: lodgeObservacoes[index] || null,
        }))
        .filter((lodge) => lodge.nome.trim())
    : [];

  return eventSchema.parse({
    tipo,
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao') || null,
    local: formData.get('local'),
    dataInicio: typeof dataInicioRaw === 'string' ? parseBrazilDateTimeLocal(dataInicioRaw) : null,
    dataFim:
      typeof dataFimRaw === 'string' && dataFimRaw ? parseBrazilDateTimeLocal(dataFimRaw) : null,
    exigeConfirmacaoPresenca: formData.get('exigeConfirmacaoPresenca') === 'on',
    capacidadeMaxima: capacidadeMaxima ? capacidadeMaxima : null,
    traje: formData.get('traje') || null,
    chegadaSugerida: formData.get('chegadaSugerida') || null,
    observacoes: formData.get('observacoes') || null,
    arquivosRelacionados: formData.getAll('arquivosRelacionados').map(String),
    sessionType: isSessao ? formData.get('sessionType') || null : null,
    sessionNature: isSessao ? formData.get('sessionNature') || null : null,
    degreeWork: isSessao ? formData.get('degreeWork') || null : null,
    access: isSessao ? formData.get('access') || null : null,
    isJointSession,
    participatingLodges,
  });
}

export async function createEventAction(
  _prevState: AgendaActionState,
  formData: FormData,
): Promise<AgendaActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseEventForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios e as datas.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createEvent.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  await syncEventToConnectedGoogleCalendars(container, session.authContext.tenantId, result.value);
  await notifyConnectedUsersOfNewEvent(container, session.authContext.tenantId, result.value);
  await notifyEventCreated(container, session.authContext.tenantId, result.value);

  revalidatePath('/admin/conteudo/agenda');
  redirect('/admin/conteudo/agenda');
}

export async function updateEventAction(
  eventId: string,
  _prevState: AgendaActionState,
  formData: FormData,
): Promise<AgendaActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseEventForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios e as datas.' };
  }

  const container = createServerContainer();
  const before = await container.repositories.event.findById(eventId);
  const result = await container.useCases.updateEvent.execute(session.authContext, eventId, input);
  if (!result.ok) return { error: result.error.message };

  await syncEventToConnectedGoogleCalendars(container, session.authContext.tenantId, result.value);
  if (before) {
    await notifyEventRescheduled(container, session.authContext.tenantId, before, result.value);
  }

  revalidatePath('/admin/conteudo/agenda');
  revalidatePath(`/admin/conteudo/agenda/${eventId}`);
  redirect(`/admin/conteudo/agenda/${eventId}`);
}

export async function deleteEventAction(eventId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deleteEvent.execute(session.authContext, eventId);
  if (!result.ok) throw new Error(result.error.message);

  await notifyEventCancelled(container, session.authContext.tenantId, result.value);

  revalidatePath('/admin/conteudo/agenda');
}

export async function hardDeleteEventAction(eventId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.hardDeleteEvent.execute(session.authContext, eventId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/agenda');
}

export interface ReclassifySessionActionState {
  error: string | null;
}

/** Painel de revisão em lote — corrige a classificação de uma Sessão pendente sem abrir a edição completa do Evento. */
export async function reclassifySessionAction(
  eventId: string,
  _prevState: ReclassifySessionActionState,
  formData: FormData,
): Promise<ReclassifySessionActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const sessionType = formData.get('sessionType');
  const sessionNature = formData.get('sessionNature');
  if (!sessionType || !sessionNature) {
    return { error: 'Escolha o Tipo e a Natureza da Sessão.' };
  }

  const degreeWork = formData.get('degreeWork');
  const access = formData.get('access');

  const result = await container.useCases.reclassifySession.execute(session.authContext, eventId, {
    sessionType: String(sessionType) as SessionType,
    sessionNature: String(sessionNature),
    degreeWork: degreeWork ? (String(degreeWork) as SessionWorkDegree) : null,
    access: access ? (String(access) as SessionAccessKind) : null,
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/agenda/revisao');
  revalidatePath('/admin/conteudo/agenda');
  return { error: null };
}

/** Arquivos do Acervo VL6 anexados a um evento, resolvidos a partir dos IDs compostos gravados nele — sem duplicar nenhum registro de origem. */
export async function getEventAttachmentsAction(eventId: string): Promise<ResolvedArchiveItem[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== session.authContext.tenantId) return [];

  const resolved = await Promise.all(
    (event.arquivosRelacionados ?? []).map((compositeId) =>
      resolveArchiveItem(compositeId, session.authContext, container),
    ),
  );
  return resolved.filter((item): item is ResolvedArchiveItem => item !== null);
}

/**
 * Resolve uma referência colada pelo Administrador (URL de `/acervo/item/…`
 * ou o ID composto puro) num item real do Acervo — usado pelo picker de
 * anexos do formulário de evento pra mostrar uma prévia antes de confirmar.
 */
export async function resolveAcervoItemAction(
  rawInput: string,
): Promise<{ ok: true; item: ResolvedArchiveItem } | { ok: false; error: string }> {
  const session = await requireSession();
  const container = createServerContainer();

  const marker = '/acervo/item/';
  const markerIndex = rawInput.indexOf(marker);
  const compositeId = (
    markerIndex >= 0 ? rawInput.slice(markerIndex + marker.length) : rawInput
  ).trim();

  if (!parseArchiveItemId(compositeId)) {
    return { ok: false, error: 'Link ou ID do Acervo inválido.' };
  }

  const item = await resolveArchiveItem(compositeId, session.authContext, container);
  if (!item) {
    return { ok: false, error: 'Item não encontrado no Acervo (ou sem permissão de acesso).' };
  }
  return { ok: true, item };
}

/** Status de presença do usuário atual num evento VL6 — usado pelo resumo leve do painel de detalhes da Minha Agenda. */
export async function getMyAttendanceStatusAction(
  eventId: string,
): Promise<'confirmado' | 'recusado' | 'pendente' | null> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.authContext.uid,
  );
  if (!member) return null;

  const attendance = await container.repositories.eventAttendance.findByEventAndMember(
    eventId,
    member.id,
  );
  return attendance?.statusPresenca ?? null;
}

export async function confirmAttendanceAction(
  eventId: string,
  resposta: AttendanceResponse,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.confirmAttendance.execute(
    session.authContext,
    eventId,
    resposta,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
  revalidatePath(`/eventos/${eventId}`);
}
