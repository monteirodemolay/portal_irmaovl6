'use server';

import { revalidatePath } from 'next/cache';
import { personalNoteSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface PersonalNoteActionState {
  error: string | null;
}

export async function createPersonalNoteAction(
  _prevState: PersonalNoteActionState,
  formData: FormData,
): Promise<PersonalNoteActionState> {
  const session = await requireSession();

  let input;
  try {
    input = personalNoteSchema.parse({
      texto: formData.get('texto'),
      eventoOrigem: null,
      eventoId: null,
    });
  } catch {
    return { error: 'Escreva algo para salvar a anotação.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createPersonalNote.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/agenda');
  return { error: null };
}

export async function updatePersonalNoteTextAction(noteId: string, texto: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.updatePersonalNote.execute(session.authContext, noteId, {
    texto,
  });
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}

export async function togglePersonalNotePinAction(noteId: string, fixada: boolean): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.updatePersonalNote.execute(session.authContext, noteId, {
    fixada,
  });
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}

export async function deletePersonalNoteAction(noteId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deletePersonalNote.execute(session.authContext, noteId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}

/** Anotação privada vinculada a um evento específico (Loja, pessoal ou Google) — autosave no painel de detalhes. */
export async function upsertPersonalEventNoteAction(input: {
  eventoOrigem: 'vl6' | 'personal' | 'google';
  eventoId: string;
  texto: string;
}): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.upsertPersonalEventNote.execute(
    session.authContext,
    input,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}
