'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';

export async function ensureBibliotecarioRoleAction(): Promise<void> {
  const session = await requirePagePermission('role:manage');
  const container = createServerContainer();
  await container.useCases.ensureBibliotecarioRole.execute(session.authContext);
  revalidatePath('/admin/pessoas/permissoes');
  revalidatePath('/admin/pessoas/usuarios');
}
