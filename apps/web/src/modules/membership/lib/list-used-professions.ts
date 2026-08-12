import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { COMMON_PROFESSIONS } from '@/lib/membership/professions';

/**
 * Profissões já usadas no tenant que não estão na lista pré-definida — é
 * assim que uma profissão digitada como "Outra" (`OTHER_PROFESSION_VALUE`
 * em member-actions.ts) passa a aparecer como opção nos próximos cadastros,
 * sem precisar de uma coleção nova só pra isso. Reaproveita `searchMembers`
 * (sem filtros, limite alto) em vez de um método de repositório dedicado —
 * o tenant de uma Loja não tem escala pra justificar uma agregação separada.
 */
export async function listUsedProfessions(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<string[]> {
  const predefined = new Set<string>(COMMON_PROFESSIONS);
  const page = await container.useCases.searchMembers.execute(authContext, {}, { limit: 500 });
  const custom = new Set<string>();
  for (const member of page.items) {
    if (member.profissao && !predefined.has(member.profissao)) {
      custom.add(member.profissao);
    }
  }
  return [...custom].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
