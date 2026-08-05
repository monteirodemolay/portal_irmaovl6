'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eventSchema } from '@vl6/shared';
import type { AttendanceResponse } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface AgendaActionState {
  error: string | null;
}

export async function createEventAction(
  _prevState: AgendaActionState,
  formData: FormData,
): Promise<AgendaActionState> {
  const session = await requireSession();

  const capacidadeMaxima = formData.get('capacidadeMaxima');
  let input;
  try {
    input = eventSchema.parse({
      tipo: formData.get('tipo'),
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao') || null,
      local: formData.get('local'),
      dataInicio: formData.get('dataInicio'),
      dataFim: formData.get('dataFim'),
      exigeConfirmacaoPresenca: formData.get('exigeConfirmacaoPresenca') === 'on',
      capacidadeMaxima: capacidadeMaxima ? capacidadeMaxima : null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios e as datas.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createEvent.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/agenda');
  redirect('/admin/agenda');
}

export async function confirmAttendanceAction(
  eventId: string,
  resposta: AttendanceResponse,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.confirmAttendance.execute(
    session.authContext,
    eventId,
    resposta,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
  revalidatePath(`/eventos/${eventId}`);
}
