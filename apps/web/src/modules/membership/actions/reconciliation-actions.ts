'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { ActiveMembersReconciliationResultRow } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

/**
 * Aplica a reconciliação de cadastro ativo (ver
 * `ApplyActiveMembersReconciliationUseCase`) — pedido direto do
 * Administrador em 2026-09-14. Ação única, sem input: a lista-alvo está
 * fixa em `ACTIVE_MEMBERS_RECONCILIATION_LIST`.
 */
export async function applyActiveMembersReconciliationAction(): Promise<
  ActiveMembersReconciliationResultRow[]
> {
  const session = await requireSession();
  const container = createServerContainer();

  const results = await container.useCases.applyActiveMembersReconciliation.execute(
    session.authContext,
  );

  if (results.length > 0) {
    revalidatePath('/admin/pessoas/irmaos');
    revalidatePath('/admin/pessoas/irmaos/reconciliar-ativos');
    revalidatePath('/admin/pessoas/usuarios');
    revalidatePath('/dashboard');
  }

  return results;
}
