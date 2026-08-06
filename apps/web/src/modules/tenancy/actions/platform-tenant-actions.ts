'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export async function setTenantActiveAction(
  tenantId: string,
  ativo: boolean,
  _formData: FormData,
): Promise<void> {
  const session = await requireSession();

  const container = createServerContainer();
  const result = await container.useCases.setTenantActive.execute(session.authContext, {
    tenantId,
    ativo,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/plataforma');
}
