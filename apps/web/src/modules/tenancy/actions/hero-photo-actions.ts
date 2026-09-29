'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, logger } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { uploadHeroPhoto, validateHeroPhotoFile } from '@/lib/tenant/hero-photo-upload';

export interface HeroPhotoActionState {
  error: string | null;
}

/**
 * Só o Administrador da Loja (`tenant:manage`) chega até aqui — o formulário
 * que dispara esta action só é renderizado pra quem tem a permissão
 * (`PageHeroPhotoUpload`), e o Use Case reforça a mesma checagem
 * (`requirePermission`, defesa em profundidade). `pageKey`/`path` vêm
 * amarrados via `.bind(null, pageKey, path)` na própria página (nunca do
 * `FormData`), então são sempre um valor fixo do nosso código.
 */
export async function updateHeroPhotoAction(
  pageKey: string,
  path: string,
  _prevState: HeroPhotoActionState,
  formData: FormData,
): Promise<HeroPhotoActionState> {
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
    fotoUrl = await uploadHeroPhoto(file, session.authContext.tenantId, pageKey);
  } catch (error) {
    logger.error('Falha ao enviar foto do PageHero para o storage', {
      route: 'updateHeroPhotoAction',
      tenantId: session.authContext.tenantId,
      pageKey,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'updateHeroPhotoAction:foto' } });
    return { error: 'Não foi possível enviar a foto. Tente novamente em instantes.' };
  }

  const result = await container.useCases.updateHeroPhoto.execute(session.authContext, {
    pageKey,
    fotoUrl,
    posicao,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(path, 'layout');
  return { error: null };
}

/** "Retirar foto" do mock-up — volta a hero ao gradiente padrão. */
export async function removeHeroPhotoAction(
  pageKey: string,
  path: string,
  _prevState: HeroPhotoActionState,
  _formData: FormData,
): Promise<HeroPhotoActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.updateHeroPhoto.execute(session.authContext, {
    pageKey,
    fotoUrl: null,
    posicao: null,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(path, 'layout');
  return { error: null };
}
