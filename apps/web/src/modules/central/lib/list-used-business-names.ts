import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';

/**
 * Nomes de empresa/negócio (`CentralBusinessEntry.nomeEmpresa`) já usados
 * por outros Irmãos no tenant — alimenta o autocomplete do campo "Nome da
 * empresa" em `EmpresaTab`. Varre `listByTenant` (todo status, não só
 * publicado) de propósito: o objetivo é ajudar a consolidar o cadastro
 * ("Padaria do João" em vez de "padaria joão" e "Padaria Joao"), não
 * respeitar visibilidade — quem já está preenchendo esse mesmo formulário
 * tem `memberCentral:update`, então não é dado sensível sendo exposto.
 */
export async function listUsedBusinessNames(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<string[]> {
  const profiles = await container.repositories.memberCentralProfile.listByTenant(
    authContext.tenantId,
  );
  const names = new Set<string>();
  for (const profile of profiles) {
    for (const negocio of profile.negocios) {
      if (negocio.nomeEmpresa) names.add(negocio.nomeEmpresa);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
