import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';

/**
 * Empresas (`Member.empresa`) já digitadas por outros Irmãos do tenant —
 * alimenta o autocomplete do campo "Empresa" (`CompanyCard`), pra reduzir
 * variações do mesmo nome ("Cia X", "Cia X Ltda", "cia x") e consolidar
 * todo mundo no mesmo item quando possível. Mesmo padrão de
 * `listUsedProfessions`: reaproveita `searchMembers` (sem filtros, limite
 * alto) em vez de um método de repositório dedicado.
 */
export async function listUsedCompanies(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<string[]> {
  const page = await container.useCases.searchMembers.execute(authContext, {}, { limit: 500 });
  const companies = new Set<string>();
  for (const member of page.items) {
    if (member.empresa) companies.add(member.empresa);
  }
  return [...companies].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
