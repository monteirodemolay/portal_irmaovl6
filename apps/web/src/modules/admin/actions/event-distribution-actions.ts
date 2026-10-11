'use server';

import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import type { ContentActionState } from '@/modules/content/actions/content-actions';

/** Atualização parcial e auditoria atômicas, sem regravar derivados ou dados da ficha. */
export async function saveEventDistributionAction(
  eventId: string,
  _state: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const { authContext: ctx } = await requireSession();
  requirePermission(ctx, 'event:read');
  requirePermission(ctx, 'event:update');
  const c = createServerContainer();
  const ref = c.db.collection('events').doc(eventId);
  const auditRef = c.db.collection('auditLogs').doc();
  const fields = {
    exibirNaTelaInicial: formData.get('exibirNaTelaInicial') === 'on',
    exibirNaLinhaDoTempo: formData.get('exibirNaLinhaDoTempo') === 'on',
  };
  try {
    await c.db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.get('tenantId') !== ctx.tenantId || snap.get('deletedAt'))
        throw new Error('Acontecimento não encontrado.');
      const previous = {
        exibirNaTelaInicial: snap.get('exibirNaTelaInicial') ?? true,
        exibirNaLinhaDoTempo: snap.get('exibirNaLinhaDoTempo') ?? true,
      };
      const timestamp = Timestamp.now();
      transaction.update(ref, { ...fields, updatedAt: timestamp, updatedBy: ctx.uid });
      transaction.set(auditRef, {
        tenantId: ctx.tenantId,
        entidade: 'events',
        entidadeId: eventId,
        acao: 'update',
        usuarioId: ctx.uid,
        ip: null,
        dispositivo: null,
        valorAnterior: previous,
        valorNovo: fields,
        timestamp,
      });
    });
  } catch {
    return {
      error: 'Não foi possível salvar a distribuição. Recarregue a ficha e tente novamente.',
    };
  }
  for (const path of [
    '/dashboard',
    '/admin/publicacoes',
    `/admin/publicacoes/${eventId}`,
    '/acervo/linha-do-tempo',
  ])
    revalidatePath(path);
  return { error: null, success: 'Distribuição salva. As visões do Portal foram atualizadas.' };
}
