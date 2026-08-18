'use server';

import { revalidatePath } from 'next/cache';
import { personalTaskSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface PersonalTaskActionState {
  error: string | null;
}

export async function createPersonalTaskAction(
  _prevState: PersonalTaskActionState,
  formData: FormData,
): Promise<PersonalTaskActionState> {
  const session = await requireSession();

  let input;
  try {
    input = personalTaskSchema.parse({ titulo: formData.get('titulo') });
  } catch {
    return { error: 'Informe um título para a tarefa.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createPersonalTask.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/agenda');
  return { error: null };
}

export async function togglePersonalTaskAction(taskId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.togglePersonalTask.execute(session.authContext, taskId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}

export async function deletePersonalTaskAction(taskId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deletePersonalTask.execute(session.authContext, taskId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}
