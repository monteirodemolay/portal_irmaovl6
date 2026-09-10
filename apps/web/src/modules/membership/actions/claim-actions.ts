'use server';

import { headers } from 'next/headers';
import { createServerContainer } from '@vl6/infra';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getClientIp } from '@/lib/api/get-client-ip';
import { RateLimiter } from '@/lib/api/rate-limiter';

export interface ClaimActionState {
  error: string | null;
  success: boolean;
}

const EMPTY_STATE: ClaimActionState = { error: null, success: false };

const claimRateLimiter = new RateLimiter();

/**
 * Envia a solicitação de acesso do fluxo público "Reivindicar meu
 * cadastro" — sem sessão, então nada aqui passa por
 * `requireSession`/`AuthContext`. A prova de identidade é o Nome+CIM
 * checados por `SubmitMemberAccessClaimUseCase`; diferente do fluxo
 * anterior, isto NUNCA cria a conta Firebase Auth/`User` na hora — só
 * registra a solicitação em `pendente`, pra um Administrador revisar
 * (`/admin/pessoas/solicitacoes-acesso`, `ApproveMemberAccessClaimAction`).
 * Rate limit por IP — sem ele, o par Nome+CIM (~5 dígitos) seria alvo fácil
 * de tentativa por tentativa.
 */
export async function submitMemberAccessClaimAction(
  _prevState: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const current = await getCurrentTenant();
  if (!current) {
    return {
      ...EMPTY_STATE,
      error:
        'Não foi possível identificar sua Loja. Acesse pelo endereço do Portal enviado pela Secretaria.',
    };
  }

  const ip = getClientIp({ headers: await headers() });
  const limit = claimRateLimiter.check(`claim:${ip}`, { limit: 5, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return {
      ...EMPTY_STATE,
      error: 'Muitas tentativas. Aguarde um minuto antes de tentar de novo.',
    };
  }

  const memberId = String(formData.get('memberId') ?? '').trim();
  const cim = String(formData.get('cim') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!memberId || !cim) {
    return { ...EMPTY_STATE, error: 'Escolha seu nome e informe a CIM.' };
  }
  if (!email.includes('@')) {
    return { ...EMPTY_STATE, error: 'Informe um e-mail válido.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.submitMemberAccessClaim.execute(
    current.tenant.id,
    memberId,
    cim,
    email,
    ip,
  );
  if (!result.ok) {
    return { ...EMPTY_STATE, error: result.error.message };
  }

  return { error: null, success: true };
}
