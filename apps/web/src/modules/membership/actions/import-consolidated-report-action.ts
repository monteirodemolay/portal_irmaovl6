'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { ImportConsolidatedReportResultRow } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';
import { CONSOLIDATED_REPORT_ROWS } from '../lib/consolidated-report-data';

/**
 * Importação única do "Relatório Consolidado de Datas" (dataset transcrito
 * em `consolidated-report-data.ts`) — ver `ImportConsolidatedReportUseCase`
 * pra regra de vínculo/preenchimento.
 */
export async function importConsolidatedReportAction(): Promise<
  ImportConsolidatedReportResultRow[]
> {
  const session = await requireSession();
  const container = createServerContainer();

  const results = await container.useCases.importConsolidatedReport.execute(
    session.authContext,
    CONSOLIDATED_REPORT_ROWS,
  );

  if (results.some((r) => r.status === 'atualizado')) {
    revalidatePath('/admin/pessoas/irmaos');
    revalidatePath('/dashboard');
  }

  return results;
}
