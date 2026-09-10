'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { DedupeMemberPositionHistoryResult } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface DedupeMemberPositionHistoryActionState {
  error: string | null;
  result: DedupeMemberPositionHistoryResult | null;
}

/**
 * Limpa os registros de histórico de cargos (`MemberPositionHistory`)
 * duplicados — gerados por execuções anteriores da importação da nominata
 * histórica que expiraram no meio do caminho. Seguro rodar quantas vezes
 * for preciso.
 */
export async function dedupeMemberPositionHistoryAction(): Promise<DedupeMemberPositionHistoryActionState> {
  const session = await requireSession();

  const container = createServerContainer();
  const result = await container.useCases.dedupeMemberPositionHistory.execute(session.authContext);
  if (!result.ok) {
    return { error: result.error.message, result: null };
  }

  revalidatePath('/admin/pessoas/gestoes');
  return { error: null, result: result.value };
}
