'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { DuplicateMemberGroup, MergeDuplicateMembersReport } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export async function loadDuplicateMembersAction(): Promise<DuplicateMemberGroup[]> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.listDuplicateMembers.execute(session.authContext);
  return result.ok ? result.value : [];
}

export type MergeDuplicateMembersActionResult =
  { ok: true; report: MergeDuplicateMembersReport } | { ok: false; error: string };

/**
 * Mescla os cadastros duplicados selecionados no cadastro canônico —
 * `/admin/pessoas/irmaos/duplicados`. Reatribui histórico de cargos,
 * situações e titularidades antes de arquivar cada duplicado; nunca apaga
 * nada de verdade (soft delete).
 */
export async function mergeDuplicateMembersAction(
  canonicalMemberId: string,
  duplicateMemberIds: string[],
): Promise<MergeDuplicateMembersActionResult> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.mergeDuplicateMembers.execute(
    session.authContext,
    canonicalMemberId,
    duplicateMemberIds,
  );
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath('/admin/pessoas/irmaos/duplicados');
  return { ok: true, report: result.value };
}
