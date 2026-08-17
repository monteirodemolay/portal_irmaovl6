'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eventSchema } from '@vl6/shared';
import type { AttendanceResponse } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import {
  resolveArchiveItem,
  type ResolvedArchiveItem,
} from '@/modules/archive/lib/resolve-archive-item';
import { parseArchiveItemId } from '@/modules/archive/lib/archive-item-id';

export interface AgendaActionState {
  error: string | null;
}

function parseEventForm(formData: FormData) {
  const capacidadeMaxima = formData.get('capacidadeMaxima');
  return eventSchema.parse({
    tipo: formData.get('tipo'),
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao') || null,
    local: formData.get('local'),
    dataInicio: formData.get('dataInicio'),
    dataFim: formData.get('dataFim'),
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
