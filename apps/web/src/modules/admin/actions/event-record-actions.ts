'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deleteEventAction } from '@/modules/agenda/actions/agenda-actions';

/**
 * Exclusão operacional da Ficha Única.
 * Reutiliza a regra existente de exclusão do acontecimento (soft delete),
 * preservando auditoria e notificações já implementadas. Os conteúdos
 * relacionados não são apagados em cascata nesta ação.
 */
export async function archiveEventRecordAction(eventId: string, formData: FormData): Promise<void> {
  if (formData.get('confirm') !== 'on') return;

  await deleteEventAction(eventId);

  revalidatePath('/admin');
  revalidatePath('/admin/publicacoes');
  revalidatePath(`/admin/publicacoes/${eventId}`);
  revalidatePath('/agenda');
  redirect('/admin/publicacoes?acontecimento=arquivado');
}
