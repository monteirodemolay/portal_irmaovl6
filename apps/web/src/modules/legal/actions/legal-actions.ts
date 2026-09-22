'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import type { LegalDocumentKey } from '@vl6/domain';
import { recordLegalAcceptanceSchema } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import { getClientIp } from '@/lib/api/get-client-ip';

export interface AcceptLegalDocumentState {
  error: string | null;
  ok: boolean;
}

const EMPTY_STATE: AcceptLegalDocumentState = { error: null, ok: false };

/**
 * Registra o aceite (pelo usuário já autenticado) de uma versão vigente que
 * exigia novo aceite — usada na área "Termos e Privacidade"
 * (`/irmaos/configuracoes/termos-e-privacidade`), tanto no fluxo normal de
 * revisão quanto no gate que redireciona pra lá quando há pendência (ver
 * `(member)/layout.tsx`).
 */
export async function acceptLegalDocumentAction(
  _prevState: AcceptLegalDocumentState,
  formData: FormData,
): Promise<AcceptLegalDocumentState> {
  const session = await requireSession();

  const parsed = recordLegalAcceptanceSchema.safeParse({
    documento: formData.get('documento'),
    versao: formData.get('versao'),
  });
  if (!parsed.success) {
    return {
      ...EMPTY_STATE,
      error: 'Não foi possível identificar qual versão você está aceitando.',
    };
  }

  const headerList = await headers();
  const container = createServerContainer();

  const result = await container.useCases.recordLegalAcceptance.execute({
    tenantId: session.authContext.tenantId,
    userId: session.authContext.uid,
    documento: parsed.data.documento as LegalDocumentKey,
    versao: parsed.data.versao,
    ip: getClientIp({ headers: headerList }),
    userAgent: headerList.get('user-agent'),
  });

  if (!result.ok) {
    return { ...EMPTY_STATE, error: result.error.message };
  }

  revalidatePath('/irmaos/configuracoes/termos-e-privacidade');
  return { error: null, ok: true };
}
