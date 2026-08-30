import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { BoardTerm } from '../entities/board-term.entity';

export interface MemberJourneyCargo {
  cargo: string;
  gestaoNome: string;
  dataInicio: Date;
  dataFim: Date | null;
}

export interface GetMemberJourneyDeps {
  memberPositionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
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
  const terms = await Promise.all(
    gestaoIds.map((gestaoId) => deps.boardTermRepository.findById(gestaoId)),
  );
  const termNameById = new Map(
    terms.filter((term): term is BoardTerm => term !== null).map((term) => [term.id, term.nome]),
  );

  return [...history]
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
    .map((entry) => ({
      cargo: entry.cargo,
      gestaoNome: termNameById.get(entry.gestaoId) ?? 'Gestão',
      dataInicio: entry.dataInicio,
      dataFim: entry.dataFim,
    }));
}
