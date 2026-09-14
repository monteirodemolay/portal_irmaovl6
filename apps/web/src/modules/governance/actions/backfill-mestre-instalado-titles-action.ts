'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { BackfillMestreInstaladoTitlesResult } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface BackfillMestreInstaladoTitlesActionState {
  error: string | null;
  result: BackfillMestreInstaladoTitlesResult | null;
}

/**
 * Concede o título de Mestre Instalado, retroativamente, a todo Irmão que
 * já exerceu o cargo de Venerável Mestre e ainda não tinha o título —
 * convenção institucional confirmada pelo Administrador (dali em diante a
 * concessão é automática, ver `grantMestreInstaladoTitleIfNeeded`). Seguro
 * rodar quantas vezes for preciso.
 */
export async function backfillMestreInstaladoTitlesAction(): Promise<BackfillMestreInstaladoTitlesActionState> {
  const session = await requireSession();

  const container = createServerContainer();
  const result = await container.useCases.backfillMestreInstaladoTitles.execute(
    session.authContext,
  );
  if (!result.ok) {
    return { error: result.error.message, result: null };
  }

  revalidatePath('/admin/pessoas/gestoes');
  return { error: null, result: result.value };
}
