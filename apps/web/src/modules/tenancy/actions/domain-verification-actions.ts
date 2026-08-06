'use server';

import { revalidatePath } from 'next/cache';
import { requestDomainVerificationSchema } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface DomainVerificationActionState {
  error: string | null;
  domain: string | null;
  token: string | null;
  verified: boolean;
}

const EMPTY_STATE: DomainVerificationActionState = {
  error: null,
  domain: null,
  token: null,
  verified: false,
};

/** Gera o token e o registro pendente — ver `RequestDomainVerificationUseCase`. */
export async function requestDomainVerificationAction(
  _prevState: DomainVerificationActionState,
  formData: FormData,
): Promise<DomainVerificationActionState> {
  const session = await requireSession();

  const parsed = requestDomainVerificationSchema.safeParse({ domain: formData.get('domain') });
  if (!parsed.success) {
    return { ...EMPTY_STATE, error: 'Domínio inválido. Use o formato exemplo.com.br.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.requestDomainVerification.execute(
    session.authContext,
    parsed.data,
  );
  if (!result.ok) {
    return { ...EMPTY_STATE, error: result.error.message };
  }

  revalidatePath('/admin/loja');
  return {
    error: null,
    domain: result.value.id,
    token: result.value.token,
    verified: result.value.verified,
  };
}

/** Checa o TXT record e ativa `Tenant.dominio` se encontrado — ver `VerifyDomainUseCase`. */
export async function verifyDomainAction(
  _prevState: DomainVerificationActionState,
  formData: FormData,
): Promise<DomainVerificationActionState> {
  const session = await requireSession();

  const domain = String(formData.get('domain') ?? '');
  if (!domain) {
    return { ...EMPTY_STATE, error: 'Domínio ausente.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.verifyDomain.execute(session.authContext, { domain });
  if (!result.ok) {
    return { ...EMPTY_STATE, error: result.error.message };
  }

  revalidatePath('/admin/loja');
  return {
    error: result.value.verified
      ? null
      : 'Ainda não encontramos o registro TXT. DNS pode levar até 24h para propagar — tente de novo mais tarde.',
    domain: result.value.id,
    token: result.value.token,
    verified: result.value.verified,
  };
}
