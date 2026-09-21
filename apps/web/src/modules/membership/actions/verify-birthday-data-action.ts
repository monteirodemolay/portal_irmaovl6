'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { VerifyBirthdayMismatch } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';
import {
  BIRTHDAY_REPORT_DATE,
  IMPORTED_CONJUGES,
  IMPORTED_FILHOS,
  IMPORTED_IRMAOS,
} from '../lib/birthday-import-data';

/**
 * Confere dia/mês de nascimento do Irmão/cônjuge/filhos já cadastrados
 * contra o mesmo relatório GLEG usado em `importBirthdayDataAction` e
 * corrige quem não bate — ao contrário da importação, que só preenche
 * campo em branco, este confere e corrige até um valor já preenchido, mas
 * errado. Ver `VerifyBirthdayDataUseCase`.
 */
export async function verifyBirthdayDataAction(): Promise<VerifyBirthdayMismatch[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.verifyBirthdayData.execute(session.authContext, {
    reportDate: BIRTHDAY_REPORT_DATE,
    irmaos: IMPORTED_IRMAOS,
    conjuges: IMPORTED_CONJUGES,
    filhos: IMPORTED_FILHOS,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  if (result.value.length > 0) {
    revalidatePath('/admin/pessoas/irmaos');
    revalidatePath('/dashboard');
  }

  return result.value;
}
