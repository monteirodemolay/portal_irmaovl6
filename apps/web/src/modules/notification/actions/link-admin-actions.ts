'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { linkSchema, type LinkFormValues } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const LINKS_ADMIN_PATH = '/admin/conteudo/links';

export interface LinkActionState {
  error: string | null;
}

function parseLinkForm(formData: FormData): LinkFormValues {
  return linkSchema.parse({
    titulo: formData.get('titulo'),
    url: formData.get('url'),
    descricao: formData.get('descricao') || null,
    icone: null,
    categoria: formData.get('categoria'),
    tipoAcesso: formData.get('tipoAcesso'),
    destaque: formData.get('destaque') === 'on',
    ordem: formData.get('ordem') || 0,
  });
}

export async function createLinkAction(
  _prevState: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  const session = await requireSession();

  let input: LinkFormValues;
  try {
    input = parseLinkForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createLink.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(LINKS_ADMIN_PATH);
  revalidatePath('/links-uteis');
  redirect(LINKS_ADMIN_PATH);
}

export async function updateLinkAction(
  linkId: string,
  _prevState: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  const session = await requireSession();

  let input: LinkFormValues;
  try {
    input = parseLinkForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateLink.execute(session.authContext, linkId, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(LINKS_ADMIN_PATH);
  revalidatePath('/links-uteis');
  redirect(LINKS_ADMIN_PATH);
}

export async function setLinkActiveAction(linkId: string, ativo: boolean): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.setLinkActive.execute(session.authContext, linkId, ativo);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath(LINKS_ADMIN_PATH);
  revalidatePath('/links-uteis');
}

export async function moveLinkAction(linkId: string, direction: 'up' | 'down'): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.moveLink.execute(session.authContext, linkId, direction);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath(LINKS_ADMIN_PATH);
  revalidatePath('/links-uteis');
}

export async function approveLinkSuggestionAction(suggestionId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.approveLinkSuggestion.execute(
    session.authContext,
    suggestionId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath(LINKS_ADMIN_PATH);
}

export interface RejectLinkSuggestionState {
  error: string | null;
  success: boolean;
}

export async function rejectLinkSuggestionAction(
  suggestionId: string,
  _prevState: RejectLinkSuggestionState,
  formData: FormData,
): Promise<RejectLinkSuggestionState> {
  const session = await requireSession();
  const motivo = String(formData.get('motivo') ?? '');

  const container = createServerContainer();
  const result = await container.useCases.rejectLinkSuggestion.execute(
    session.authContext,
    suggestionId,
    motivo,
  );
  if (!result.ok) return { error: result.error.message, success: false };

  revalidatePath(LINKS_ADMIN_PATH);
  return { error: null, success: true };
}
