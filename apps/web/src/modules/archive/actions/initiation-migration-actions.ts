'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, logger } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type { SeedInitiationArchiveItemsReport } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface SeedInitiationArchiveItemsState {
  error: string | null;
  report: SeedInitiationArchiveItemsReport | null;
}

/**
 * Backfill retroativo — cria o `ArchiveItem` de iniciação pra todo Irmão do
 * tenant que já tem `dataIniciacao` preenchida e ainda não tem o item
 * correspondente (docs/architecture/11-acervo-vl6.md §11.5). Idempotente:
 * rodar de novo só cobre quem ficou de fora da vez anterior. Disparado
 * manualmente pelo Admin em `/admin/acervo/iniciacao-migracao` — nunca
 * automático num deploy.
 */
export async function seedInitiationArchiveItemsAction(): Promise<SeedInitiationArchiveItemsState> {
  const session = await requireSession();
  const container = createServerContainer();

  try {
    const report = await container.useCases.seedInitiationArchiveItems.execute(session.authContext);
    revalidatePath('/admin/acervo/iniciacao-migracao');
    revalidatePath('/admin/acervo/publicar');
    return { error: null, report };
  } catch (error) {
    logger.error('Falha no backfill de itens de iniciação do Acervo VL6', {
      route: 'seedInitiationArchiveItemsAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'seedInitiationArchiveItemsAction' } });
    return { error: 'Não foi possível concluir o backfill. Tente novamente.', report: null };
  }
}
