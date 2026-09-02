import { normalizeNameForSearch, type FamilyPersonRefKind } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';

export interface FamilyPersonCandidate {
  kind: FamilyPersonRefKind;
  id: string;
  nomeCompleto: string;
}

export interface SearchFamilyPersonCandidatesDeps {
  familyPersonRepository: IFamilyPersonRepository;
  memberRepository: IMemberRepository;
}

/**
 * Passo de deduplicação do painel de cadastro (04_TELAS_E_FLUXOS.md §3): "o
 * botão de criação deve ficar desabilitado enquanto existir candidato
 * provável não analisado". Pesquisa nas duas formas canônicas de pessoa —
 * `Member` (Irmão já cadastrado) e `FamilyPerson` (familiar já registrado
 * por qualquer Irmão do tenant) — para nunca duplicar um registro que já
 * existe. Ação pessoal, sem `requirePermission`: é só leitura de nome, parte
 * do fluxo de "Adicionar familiar" do próprio Irmão.
 */
export class SearchFamilyPersonCandidatesUseCase {
  constructor(private readonly deps: SearchFamilyPersonCandidatesDeps) {}

  async execute(ctx: AuthContext, nomeCompleto: string): Promise<FamilyPersonCandidate[]> {
    const nomeBusca = normalizeNameForSearch(nomeCompleto);
    if (nomeBusca.length < 3) return [];

    const [familyPersons, memberPage] = await Promise.all([
      this.deps.familyPersonRepository.searchByNormalizedName(ctx.tenantId, nomeBusca, 10),
      this.deps.memberRepository.search(
        { tenantId: ctx.tenantId, nome: nomeCompleto },
        { limit: 10 },
      ),
    ]);

    const fromMembers: FamilyPersonCandidate[] = memberPage.items.map((member) => ({
      kind: 'member',
      id: member.id,
      nomeCompleto: member.nomeCompleto,
    }));
    const fromFamilyPersons: FamilyPersonCandidate[] = familyPersons.map((person) => ({
      kind: 'familyPerson',
      id: person.id,
      nomeCompleto: person.nomeCompleto,
    }));

    return [...fromMembers, ...fromFamilyPersons];
  }
}
