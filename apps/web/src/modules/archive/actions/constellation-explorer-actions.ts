'use server';

import type { ExpandNodeInput, ExplorerExpansion } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

/**
 * Expande um nó da Constelação da Memória explorável sob demanda — chamada
 * direta de função (não `useActionState`/`<form>`) a partir do componente
 * cliente `InteractiveConstellationExplorer`, que já trata o `throw` como
 * estado de erro recuperável ("Tentar novamente").
 */
export async function expandConstellationNodeAction(
  input: ExpandNodeInput,
): Promise<ExplorerExpansion> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.expandConstellationNode.execute(
    session.authContext,
    input,
  );
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}
