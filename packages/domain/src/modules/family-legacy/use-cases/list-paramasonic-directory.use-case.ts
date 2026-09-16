import type {
  FamilyPersonRefKind,
  FamilyVisibilityLevel,
  FraternalAffiliationKind,
} from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IPersonFraternalRecordRepository } from '../repositories/person-fraternal-record.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface ListParamasonicDirectoryDeps {
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
  familyPersonRepository: IFamilyPersonRepository;
  memberRepository: IMemberRepository;
}

export interface ParamasonicDirectoryEntryDTO {
  recordId: string;
  personKind: FamilyPersonRefKind;
  personId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  affiliationKind: FraternalAffiliationKind;
  organizacaoNome: string | null;
  unidadeNome: string | null;
  cidade: string | null;
  estado: string | null;
  grau: string | null;
}

const PUBLIC_VISIBILITY_LEVELS: readonly FamilyVisibilityLevel[] = ['members', 'archive'];

/**
 * "Diretório de Paramaçônicas" — vitrine institucional de toda pessoa com
 * afiliação a uma ordem paramaçônica cadastrada (DeMolay, Filhas de Jó,
 * Estrela do Oriente, Arco-Íris, Fraternidade Feminina, Lowton, outra) —
 * nunca inclui `affiliationKind === 'mason'` (isso já é o próprio Diretório
 * de Irmãos da Loja). Mesmo recorte de visibilidade dupla de
 * `buildPublicFamiliaLegado`: o registro de afiliação em si precisa estar
 * `members`/`archive`, e — quando a pessoa é uma `familyPerson` — o
 * cadastro da pessoa também precisa estar nesse mesmo nível, senão nunca
 * aparece aqui mesmo com o registro de afiliação visível.
 */
export class ListParamasonicDirectoryUseCase {
  constructor(private readonly deps: ListParamasonicDirectoryDeps) {}

  async execute(ctx: AuthContext): Promise<ParamasonicDirectoryEntryDTO[]> {
    requirePermission(ctx, 'familyLegacy:read');

    const allRecords = await this.deps.personFraternalRecordRepository.listByTenant(ctx.tenantId);
    const records = allRecords.filter(
      (record) =>
        record.affiliationKind !== 'mason' && PUBLIC_VISIBILITY_LEVELS.includes(record.visibility),
    );
    if (records.length === 0) return [];

    const familyPersonIds = [
      ...new Set(records.filter((r) => r.personKind === 'familyPerson').map((r) => r.personId)),
    ];
    const memberIds = [
      ...new Set(records.filter((r) => r.personKind === 'member').map((r) => r.personId)),
    ];
    const [familyPersons, resolvedMembers] = await Promise.all([
      familyPersonIds.length > 0
        ? this.deps.familyPersonRepository.listByIds(ctx.tenantId, familyPersonIds)
        : Promise.resolve([]),
      Promise.all(memberIds.map((id) => this.deps.memberRepository.findById(id))),
    ]);
    const familyPersonById = new Map(familyPersons.map((p) => [p.id, p]));
    const memberById = new Map(
      resolvedMembers.filter((m): m is NonNullable<typeof m> => m !== null).map((m) => [m.id, m]),
    );

    const entries: ParamasonicDirectoryEntryDTO[] = [];
    for (const record of records) {
      if (record.personKind === 'familyPerson') {
        const person = familyPersonById.get(record.personId);
        if (!person || !PUBLIC_VISIBILITY_LEVELS.includes(person.visibility)) continue;
        entries.push({
          recordId: record.id,
          personKind: 'familyPerson',
          personId: record.personId,
          nomeCompleto: person.nomeCompleto,
          fotoUrl: person.fotoUrl,
          affiliationKind: record.affiliationKind,
          organizacaoNome: record.organizacaoNome,
          unidadeNome: record.unidadeNome,
          cidade: record.cidade,
          estado: record.estado,
          grau: record.grau,
        });
      } else {
        const member = memberById.get(record.personId);
        if (!member) continue;
        entries.push({
          recordId: record.id,
          personKind: 'member',
          personId: record.personId,
          nomeCompleto: member.nomeCompleto,
          fotoUrl: member.fotoUrl,
          affiliationKind: record.affiliationKind,
          organizacaoNome: record.organizacaoNome,
          unidadeNome: record.unidadeNome,
          cidade: record.cidade,
          estado: record.estado,
          grau: record.grau,
        });
      }
    }

    return entries.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
  }
}
