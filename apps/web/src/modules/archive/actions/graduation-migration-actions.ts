'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, logger } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type {
  SeedElevationArchiveItemsReport,
  SeedExaltationArchiveItemsReport,
} from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface SeedElevationArchiveItemsState {
  error: string | null;
  report: SeedElevationArchiveItemsReport | null;
}

export interface SeedExaltationArchiveItemsState {
  error: string | null;
  report: SeedExaltationArchiveItemsReport | null;
}

/**
 * Backfill retroativo — mesmo papel de `seedInitiationArchiveItemsAction`
 * (`initiation-migration-actions.ts`), agora para elevação (2º grau) e
 * exaltação (3º grau). Disparado manualmente pelo Admin em
 * /admin/acervo/elevacao-migracao e /admin/acervo/exaltacao-migracao —
 * nunca automático num deploy.
 */
export async function seedElevationArchiveItemsAction(): Promise<SeedElevationArchiveItemsState> {
  const session = await requireSession();
  const container = createServerContainer();

  try {
    const report = await container.useCases.seedElevationArchiveItems.execute(session.authContext);
    revalidatePath('/admin/acervo/elevacao-migracao');
    revalidatePath('/admin/acervo/publicar');
    return { error: null, report };
  } catch (error) {
    logger.error('Falha no backfill de itens de elevação do Acervo VL6', {
      route: 'seedElevationArchiveItemsAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'seedElevationArchiveItemsAction' } });
    return { error: 'Não foi possível concluir o backfill. Tente novamente.', report: null };
  }
}

export async function seedExaltationArchiveItemsAction(): Promise<SeedExaltationArchiveItemsState> {
  const session = await requireSession();
  const container = createServerContainer();

  try {
    const report = await container.useCases.seedExaltationArchiveItems.execute(session.authContext);
    revalidatePath('/admin/acervo/exaltacao-migracao');
    revalidatePath('/admin/acervo/publicar');
    return { error: null, report };
  } catch (error) {
    logger.error('Falha no backfill de itens de exaltação do Acervo VL6', {
      route: 'seedExaltationArchiveItemsAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'seedExaltationArchiveItemsAction' } });
    return { error: 'Não foi possível concluir o backfill. Tente novamente.', report: null };
  }
}
