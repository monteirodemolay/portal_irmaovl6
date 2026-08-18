'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, eventSchema, logger, parseBrazilDateTimeLocal } from '@vl6/shared';
import type { AttendanceResponse, Event } from '@vl6/domain';
import { createServerContainer, type ServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import {
  resolveArchiveItem,
  type ResolvedArchiveItem,
} from '@/modules/archive/lib/resolve-archive-item';
import { parseArchiveItemId } from '@/modules/archive/lib/archive-item-id';

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

function parseEventForm(formData: FormData) {
  const capacidadeMaxima = formData.get('capacidadeMaxima');
  const dataInicioRaw = formData.get('dataInicio');
  const dataFimRaw = formData.get('dataFim');
  return eventSchema.parse({
    tipo: formData.get('tipo'),
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
  const result = await container.useCases.updateEvent.execute(session.authContext, eventId, input);
  if (!result.ok) return { error: result.error.message };

  await syncEventToConnectedGoogleCalendars(container, session.authContext.tenantId, result.value);

  revalidatePath('/admin/conteudo/agenda');
  revalidatePath(`/admin/conteudo/agenda/${eventId}`);
  redirect(`/admin/conteudo/agenda/${eventId}`);
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
