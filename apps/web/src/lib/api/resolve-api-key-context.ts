import 'server-only';
import type { NextRequest } from 'next/server';
import type { AuthContext } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';

/**
 * Autentica uma requisição de `/api/v1/**` via `Authorization: Bearer
 * <api-key>` — mecanismo pensado para integrações de terceiros
 * (servidor-a-servidor, sem usuário humano), distinto do cookie de sessão
 * (web) e do login por credenciais. `null` se não houver header ou a
 * chave for inválida/revogada.
 */
export async function resolveApiKeyContext(request: NextRequest): Promise<AuthContext | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const plainTextKey = header.slice('Bearer '.length).trim();
  if (!plainTextKey) {
    return null;
  }

  const container = createServerContainer();
  const result = await container.useCases.authenticateApiKey.execute({ plainTextKey });
  return result.ok ? result.value : null;
}
