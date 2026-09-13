'use server';

import { revalidatePath } from 'next/cache';
import { linkSuggestionSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const LINKS_UTEIS_PATH = '/links-uteis';

export interface ToggleLinkFavoriteState {
  favorited: boolean;
}

/** Favoritar/desfavoritar um Link — ação pessoal, sem `revalidatePath` (o client já atualiza o próprio estado). */
export async function toggleLinkFavoriteAction(linkId: string): Promise<ToggleLinkFavoriteState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.toggleLinkFavorite.execute(session.authContext, linkId);
  if (!result.ok) return { favorited: false };

  return { favorited: result.value.favorited };
}

export interface LinkSuggestionActionState {
  error: string | null;
  success: boolean;
}

/** "Sugerir um link" — qualquer Irmão autenticado, sem exigir permissão de curadoria. */
export async function submitLinkSuggestionAction(
  _prevState: LinkSuggestionActionState,
  formData: FormData,
): Promise<LinkSuggestionActionState> {
  const session = await requireSession();

  let input;
  try {
    input = linkSuggestionSchema.parse({
      titulo: formData.get('titulo'),
      url: formData.get('url'),
      descricao: formData.get('descricao') || null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique o título e o link informado.', success: false };
  }

  const container = createServerContainer();
  const result = await container.useCases.submitLinkSuggestion.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message, success: false };

  revalidatePath(LINKS_UTEIS_PATH);
  return { error: null, success: true };
}
