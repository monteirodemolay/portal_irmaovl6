import { FRATERNAL_AFFILIATION_LABELS, normalizeNameForSearch } from '@vl6/shared';
import type { IFamilyPersonRepository } from '../../family-legacy/repositories/family-person.repository';
import type { IPersonFraternalRecordRepository } from '../../family-legacy/repositories/person-fraternal-record.repository';

export interface ResolveImmediateFamilyAffiliationsDeps {
  familyPersonRepository: IFamilyPersonRepository;
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
}

/**
 * Cruza Cônjuge/Filhos (`Member.conjugeNome`/`filhos` — cadastro simples da
 * Secretaria, sem vínculo formal de parentesco) com o módulo Família e
 * Legado: quando o próprio Irmão já cadastrou essa mesma pessoa lá
 * (`FamilyPerson`, `listManagedByMember`) e registrou pra ela uma afiliação
 * que não seja `'mason'` (jurisdição feminina/mista — Filhas de Jó, Estrela
 * do Oriente etc., nunca a própria Loja), devolve o rótulo dessa afiliação
 * pra exibir ao lado do nome em "Dados cadastrais" (pedido do
 * Administrador). Casamento por nome normalizado
 * (`normalizeNameForSearch`) só quando exatamente um `FamilyPerson`
 * gerenciado por este Irmão bate com o nome — nome ambíguo (duas pessoas
 * cadastradas com o mesmo nome) não arrisca vincular a pessoa errada, fica
 * sem afiliação exibida.
 */
export async function resolveImmediateFamilyAffiliations(
  deps: ResolveImmediateFamilyAffiliationsDeps,
  tenantId: string,
  memberId: string,
  names: (string | null)[],
): Promise<Map<string, string>> {
  const uniqueNames = [...new Set(names.filter((name): name is string => Boolean(name)))];
  if (uniqueNames.length === 0) return new Map();

  const managed = await deps.familyPersonRepository.listManagedByMember(tenantId, memberId);
  const idsByNormalizedName = new Map<string, string[]>();
  for (const person of managed) {
    const key = normalizeNameForSearch(person.nomeCompleto);
    idsByNormalizedName.set(key, [...(idsByNormalizedName.get(key) ?? []), person.id]);
  }

  const affiliationByName = new Map<string, string>();
  await Promise.all(
    uniqueNames.map(async (name) => {
      const ids = idsByNormalizedName.get(normalizeNameForSearch(name));
      if (!ids || ids.length !== 1) return;
      const personId = ids[0] as string;
      const records = await deps.personFraternalRecordRepository.listByPerson(
        tenantId,
        'familyPerson',
        personId,
      );
      const paramasonic = records.find((record) => record.affiliationKind !== 'mason');
      if (paramasonic) {
        affiliationByName.set(name, FRATERNAL_AFFILIATION_LABELS[paramasonic.affiliationKind]);
      }
    }),
  );
  return affiliationByName;
}
