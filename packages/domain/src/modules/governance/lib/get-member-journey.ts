import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { ICommitteeRepository } from '../repositories/committee.repository';
import type { BoardTerm } from '../entities/board-term.entity';

export interface MemberJourneyCargo {
  cargo: string;
  gestaoNome: string;
  dataInicio: Date;
  dataFim: Date | null;
}

export interface MemberJourneyCommittee {
  nome: string;
  gestaoNome: string;
  dataInicio: Date;
  dataFim: Date | null;
}

export interface GetMemberJourneyDeps {
  memberPositionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
  committeeRepository: ICommitteeRepository;
}

async function resolveTerms(
  boardTermRepository: IBoardTermRepository,
  gestaoIds: string[],
): Promise<Map<string, BoardTerm>> {
  const terms = await Promise.all(
    gestaoIds.map((gestaoId) => boardTermRepository.findById(gestaoId)),
  );
  return new Map(
    terms.filter((term): term is BoardTerm => term !== null).map((term) => [term.id, term]),
  );
}

/**
 * Histórico de cargos institucionais de um Irmão — mais recente primeiro,
 * cada entrada já com o nome da Gestão resolvido. Registro da Loja, não
 * preferência pessoal (por isso nunca passa pelos blocos de
 * `PublicationSettings`) — mesmo dado, mesma regra de montagem, seja quem
 * chamar: a página de pessoa do Acervo VL6 (`/acervo/pessoas/[memberId]`)
 * ou o perfil público do Diretório (`GetPublicMemberProfileUseCase`).
 * Antes cada um recalculava isso por conta própria, com o mesmo código
 * copiado — um dia alguém corrigiria a regra num lugar e esqueceria do
 * outro.
 */
export async function getMemberJourneyCargos(
  deps: GetMemberJourneyDeps,
  memberId: string,
): Promise<MemberJourneyCargo[]> {
  const history = await deps.memberPositionHistoryRepository.listByMemberId(memberId);
  const gestaoIds = [...new Set(history.map((entry) => entry.gestaoId))];
  const termById = await resolveTerms(deps.boardTermRepository, gestaoIds);

  return [...history]
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
    .map((entry) => ({
      cargo: entry.cargo,
      gestaoNome: termById.get(entry.gestaoId)?.nome ?? 'Gestão',
      dataInicio: entry.dataInicio,
      dataFim: entry.dataFim,
    }));
}

/**
 * Comissões de que um Irmão participou — mesmo espírito de
 * `getMemberJourneyCargos`, mas para `Committee` em vez de cargos de
 * Diretoria. `Committee` não guarda data própria de início/fim por membro
 * (só `membrosIds`, sem histórico individual de entrada/saída), então a
 * data exibida é herdada do período da `BoardTerm` a que a comissão
 * pertence (`gestaoId` → `periodoInicio`/`periodoFim`) — mesma aproximação
 * de granularidade que "Trajetória institucional" já aceita para cargos:
 * "nesta Gestão", não "neste dia exato".
 */
export async function getMemberJourneyCommittees(
  deps: GetMemberJourneyDeps,
  tenantId: string,
  memberId: string,
): Promise<MemberJourneyCommittee[]> {
  const committees = await deps.committeeRepository.listByMemberId(tenantId, memberId);
  const gestaoIds = [...new Set(committees.map((committee) => committee.gestaoId))];
  const termById = await resolveTerms(deps.boardTermRepository, gestaoIds);

  return committees
    .map((committee) => {
      const term = termById.get(committee.gestaoId);
      return {
        nome: committee.nome,
        gestaoNome: term?.nome ?? 'Gestão',
        dataInicio: term?.periodoInicio ?? committee.createdAt,
        dataFim: term?.periodoFim ?? null,
      };
    })
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
}
