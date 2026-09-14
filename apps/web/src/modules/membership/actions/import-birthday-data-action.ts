'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { ImportBirthdayResultRow } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';
import {
  BIRTHDAY_REPORT_DATE,
  IMPORTED_CONJUGES,
  IMPORTED_FILHOS,
  IMPORTED_IRMAOS,
} from '../lib/birthday-import-data';

/**
 * Importação única dos aniversários de Irmãos/cônjuges/filhos do relatório
 * GLEG (dataset transcrito em `birthday-import-data.ts`) — ver
 * `ImportBirthdayDataUseCase` pra regra de vínculo/preenchimento.
 */
export async function importBirthdayDataAction(): Promise<ImportBirthdayResultRow[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const results = await container.useCases.importBirthdayData.execute(session.authContext, {
    reportDate: BIRTHDAY_REPORT_DATE,
    irmaos: IMPORTED_IRMAOS,
    conjuges: IMPORTED_CONJUGES,
    filhos: IMPORTED_FILHOS,
  });

  if (results.some((r) => r.status === 'atualizado')) {
    revalidatePath('/admin/pessoas/irmaos');
    revalidatePath('/dashboard');
  }

  return results;
}
