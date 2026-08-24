'use server';

import { cookies } from 'next/headers';
import { createServerContainer, getAdminAuth } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { revokeAllSessions, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export interface DeleteMyAccountState {
  ok: boolean;
  error: string | null;
}

/**
 * "Excluir minha conta de acesso" (LGPD, docs/architecture) — o Use Case de
 * domínio (`DeleteMyAccountUseCase`) já cuidou de todo o lado Firestore
 * (desvincular `Member`, apagar dados pessoais, apagar o `User`, auditoria).
 * Aqui só falta o lado Firebase Auth, que não é um repositório de domínio:
 * revogar sessões e apagar a identidade em si (Admin SDK) — mesmo padrão
 * já usado em `revokeAllSessions`/`/api/v1/auth/logout` — e limpar o
 * cookie de sessão local.
 *
 * Reautenticação recente: exigida no cliente (re-login com senha) logo
 * antes de chamar esta action — ver `DeleteAccountSection`.
 *
 * Implementação técnica — não substitui revisão jurídica da LGPD.
 */
export async function deleteMyAccountAction(): Promise<DeleteMyAccountState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.deleteMyAccount.execute(session.authContext);
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  await revokeAllSessions(session.authContext.uid);
  await getAdminAuth().deleteUser(session.authContext.uid);

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return { ok: true, error: null };
}
