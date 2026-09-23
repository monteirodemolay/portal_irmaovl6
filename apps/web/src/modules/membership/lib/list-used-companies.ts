import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';

/**
 * Empresas já digitadas no tenant — alimenta o autocomplete do campo
 * "Empresa atual" (`CompanyCard`) e do Histórico Profissional
 * (`EmploymentHistoryEditor`), pra reduzir variações do mesmo nome ("Cia
 * X", "Cia X Ltda", "cia x") e o Irmão poder selecionar uma empresa que
 * ele mesmo ou outro Irmão já cadastrou, em vez de digitar de novo.
 * Agrega três fontes (nenhuma é uma "empresa" no sentido de registro com
 * ID — todas são texto livre, sem normalização/CNPJ): `Member.empresa`
 * ("Empresa atual"), `MemberCentralProfile.historicoProfissional[].empresa`
 * (currículo) e `MemberCentralProfile.negocios[].nomeEmpresa` (Negócios &
 * Serviços). Mesmo padrão de `listUsedProfessions`: reaproveita
 * `searchMembers`/`listByTenant` (sem filtros, limite alto) em vez de uma
 * coleção/agregação dedicada — o tenant de uma Loja não tem escala pra
 * justificar isso.
 */
export async function listUsedCompanies(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<string[]> {
  const [membersPage, profiles] = await Promise.all([
    container.useCases.searchMembers.execute(authContext, {}, { limit: 500 }),
    container.repositories.memberCentralProfile.listByTenant(authContext.tenantId),
  ]);

  const companies = new Set<string>();
  for (const member of membersPage.items) {
    if (member.empresa) companies.add(member.empresa);
  }
  for (const profile of profiles) {
    for (const entry of profile.historicoProfissional) {
      if (entry.empresa) companies.add(entry.empresa);
    }
    for (const negocio of profile.negocios) {
      if (negocio.nomeEmpresa) companies.add(negocio.nomeEmpresa);
    }
  }
  return [...companies].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
