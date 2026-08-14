'use server';

import { revalidatePath } from 'next/cache';
import { isPermissionKey, type PermissionKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface CreateApiKeyActionState {
  error: string | null;
  plainTextKey: string | null;
}

export async function createApiKeyAction(
  _prevState: CreateApiKeyActionState,
  formData: FormData,
): Promise<CreateApiKeyActionState> {
  const session = await requireSession();

  const nome = String(formData.get('nome') ?? '').trim();
  const permissoes = formData
    .getAll('permissoes')
    .map(String)
    .filter(isPermissionKey) as PermissionKey[];
  if (!nome) {
    return {
      error: 'Dê um nome pra essa chave (ex.: "Sistema de folha de pagamento").',
      plainTextKey: null,
    };
  }

  const container = createServerContainer();
  const result = await container.useCases.createApiKey.execute(session.authContext, {
    nome,
    permissoes,
  });
  if (!result.ok) {
    return { error: result.error.message, plainTextKey: null };
  }

  revalidatePath('/admin/configuracoes/integracoes');
  return { error: null, plainTextKey: result.value.plainTextKey };
}

export async function revokeApiKeyAction(apiKeyId: string, _formData: FormData): Promise<void> {
  const session = await requireSession();

  const container = createServerContainer();
  const result = await container.useCases.revokeApiKey.execute(session.authContext, { apiKeyId });
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/admin/configuracoes/integracoes');
}
