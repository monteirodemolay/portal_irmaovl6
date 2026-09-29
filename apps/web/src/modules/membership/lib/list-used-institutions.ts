import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';

/**
 * Instituições de ensino já digitadas no tenant — alimenta o autocomplete
 * do campo "Instituição" (`EducationHistoryEditor`), mesmo motivo de
 * `listUsedCompanies`: reduzir variações do mesmo nome e deixar um Irmão
 * reaproveitar uma instituição que outro Irmão já cadastrou, em vez de
 * digitar de novo. Texto livre, sem registro/ID compartilhado — mesmo
 * padrão "bom o suficiente" já usado pra profissões/empresas neste projeto
 * (nenhuma coleção nova só pra isso).
 */
export async function listUsedInstitutions(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<string[]> {
  const profiles = await container.repositories.memberCentralProfile.listByTenant(
    authContext.tenantId,
  );
  const institutions = new Set<string>();
  for (const profile of profiles) {
    for (const entry of profile.formacaoAcademica) {
      if (entry.instituicao) institutions.add(entry.instituicao);
    }
  }
  return [...institutions].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
