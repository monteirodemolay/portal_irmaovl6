'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, logger } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type { SeedSessionClassificationReport } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface SeedSessionClassificationState {
  error: string | null;
  report: SeedSessionClassificationReport | null;
}

/**
 * Backfill retroativo — migra toda Sessão já cadastrada (`titulo`/`grau`
 * livres) pra classificação estruturada (Tipo/Natureza/Grau dos trabalhos/
 * Acesso). Disparado manualmente pelo Administrador em
 * /admin/conteudo/agenda/classificacao-migracao — nunca automático num
 * deploy. Idempotente: rodar de novo só cobre quem ainda não tem
 * `sessionType`.
 */
export async function seedSessionClassificationAction(): Promise<SeedSessionClassificationState> {
  const session = await requireSession();
  const container = createServerContainer();

  try {
    const report = await container.useCases.seedSessionClassification.execute(session.authContext);
    revalidatePath('/admin/conteudo/agenda');
    revalidatePath('/admin/conteudo/agenda/classificacao-migracao');
    return { error: null, report };
  } catch (error) {
    logger.error('Falha no backfill de classificação de Sessões', {
      route: 'seedSessionClassificationAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'seedSessionClassificationAction' } });
    return { error: 'Não foi possível concluir o backfill. Tente novamente.', report: null };
  }
}
