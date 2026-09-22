import 'server-only';
import { createServerContainer } from '@vl6/infra';
import type { AuthContext, LegalAcceptanceStatus } from '@vl6/domain';

/** Situação de aceite do usuário logado para Política de Privacidade e Termos de Uso. `[]` se o cálculo falhar (nunca bloqueia a navegação por conta disso). */
export async function getLegalAcceptanceStatus(
  authContext: AuthContext,
): Promise<LegalAcceptanceStatus[]> {
  const container = createServerContainer();
  const result = await container.useCases.getLegalAcceptanceStatus.execute(authContext);
  return result.ok ? result.value : [];
}
