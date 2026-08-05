'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { libraryCategorySchema, libraryItemSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface LibraryActionState {
  error: string | null;
}

export async function createLibraryCategoryAction(
  _prevState: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();

  let input;
  try {
    input = libraryCategorySchema.parse({
      nome: formData.get('nome'),
      categoriaPaiId: formData.get('categoriaPaiId') || null,
      ordem: formData.get('ordem') || 0,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createLibraryCategory.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/biblioteca');
  return { error: null };
}

export async function addLibraryItemAction(
  _prevState: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();

  let input;
  try {
    input = libraryItemSchema.parse({
      fileId: formData.get('fileId'),
      categoriaId: formData.get('categoriaId'),
      subcategoriaId: formData.get('subcategoriaId') || null,
      permiteLeituraOnline: formData.get('permiteLeituraOnline') === 'on',
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.addLibraryItem.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/biblioteca');
  redirect('/admin/biblioteca');
}
