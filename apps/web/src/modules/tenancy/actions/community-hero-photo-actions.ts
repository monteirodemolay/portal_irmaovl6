'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, logger } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import {
  uploadCommunityHeroPhoto,
  validateHeroPhotoFile,
} from '@/lib/tenant/community-hero-photo-upload';

export interface CommunityHeroPhotoActionState {
  error: string | null;
}

/**
 * Só o Administrador da Loja (`tenant:manage`) chega até aqui — o formulário
 * que dispara esta action só é renderizado pra quem tem a permissão
 * (`CommunityHeroPhotoUpload`), e o Use Case reforça a mesma checagem
 * (`requirePermission`, defesa em profundidade).
 */
export async function updateCommunityHeroPhotoAction(
  _prevState: CommunityHeroPhotoActionState,
  formData: FormData,
): Promise<CommunityHeroPhotoActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const file = formData.get('foto');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione uma foto para enviar.' };
  }
  const photoError = validateHeroPhotoFile(file);
  if (photoError) return { error: photoError };

  const posicaoRaw = formData.get('posicao');
  const posicao = typeof posicaoRaw === 'string' && posicaoRaw.trim() ? Number(posicaoRaw) : 50;

  let fotoUrl: string;
  try {
    fotoUrl = await uploadCommunityHeroPhoto(file, session.authContext.tenantId);
  } catch (error) {
    logger.error('Falha ao enviar foto do Templo (hero da Comunidade VL6) para o storage', {
      route: 'updateCommunityHeroPhotoAction',
      tenantId: session.authContext.tenantId,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'updateCommunityHeroPhotoAction:foto' } });
    return { error: 'Não foi possível enviar a foto. Tente novamente em instantes.' };
  }

  const result = await container.useCases.updateComunidadeHeroFoto.execute(session.authContext, {
    fotoUrl,
    posicao,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/irmaos', 'layout');
  return { error: null };
}

/** "Retirar foto" do mock-up — volta a hero ao gradiente padrão. */
export async function removeCommunityHeroPhotoAction(
  _prevState: CommunityHeroPhotoActionState,
  _formData: FormData,
): Promise<CommunityHeroPhotoActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.updateComunidadeHeroFoto.execute(session.authContext, {
    fotoUrl: null,
    posicao: null,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/irmaos', 'layout');
  return { error: null };
}
