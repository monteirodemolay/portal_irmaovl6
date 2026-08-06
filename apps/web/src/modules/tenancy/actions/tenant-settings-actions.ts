'use server';

import { revalidatePath } from 'next/cache';
import { isLocale } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface UpdateTenantLanguageActionState {
  error: string | null;
  success: boolean;
}

export async function updateTenantLanguageAction(
  _prevState: UpdateTenantLanguageActionState,
  formData: FormData,
): Promise<UpdateTenantLanguageActionState> {
  const session = await requireSession();

  const idiomaPadrao = String(formData.get('idiomaPadrao') ?? '');
  if (!isLocale(idiomaPadrao)) {
    return { error: 'Idioma inválido.', success: false };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateTenantSettings.execute(session.authContext, {
    idiomaPadrao,
  });
  if (!result.ok) {
    return { error: result.error.message, success: false };
  }

  revalidatePath('/admin', 'layout');
  return { error: null, success: true };
}
