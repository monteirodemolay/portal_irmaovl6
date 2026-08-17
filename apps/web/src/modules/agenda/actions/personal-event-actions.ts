'use server';

import { revalidatePath } from 'next/cache';
import { personalEventSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface PersonalEventActionState {
  error: string | null;
}

function parsePersonalEventForm(formData: FormData) {
  const lembrete = formData.get('lembreteMinutosAntes');
  return personalEventSchema.parse({
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao') || null,
    local: formData.get('local') || null,
    dataInicio: formData.get('dataInicio'),
    dataFim: formData.get('dataFim'),
    lembreteMinutosAntes: lembrete ? lembrete : null,
    sincronizarComGoogle: formData.get('sincronizarComGoogle') === 'on',
  });
}

export async function createPersonalEventAction(
  _prevState: PersonalEventActionState,
  formData: FormData,
): Promise<PersonalEventActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parsePersonalEventForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios e as datas.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createPersonalEvent.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/agenda');
  return { error: null };
}

export async function updatePersonalEventAction(
  eventId: string,
  _prevState: PersonalEventActionState,
  formData: FormData,
): Promise<PersonalEventActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parsePersonalEventForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios e as datas.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updatePersonalEvent.execute(
    session.authContext,
    eventId,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/agenda');
  return { error: null };
}

export async function deletePersonalEventAction(eventId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deletePersonalEvent.execute(session.authContext, eventId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}
