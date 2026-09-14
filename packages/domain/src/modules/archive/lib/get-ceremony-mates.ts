import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { Member } from '../../membership/entities/member.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export type CeremonyMateKind = 'iniciacao' | 'elevacao' | 'exaltacao';

export interface CeremonyMate {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
}

export interface CeremonyMatesGroup {
  tipo: CeremonyMateKind;
  data: Date;
  colegas: CeremonyMate[];
}

export interface GetCeremonyMatesDeps {
  archiveItemRepository: IArchiveItemRepository;
  eventRepository: IEventRepository;
  memberRepository: IMemberRepository;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

const CEREMONIES: {
  tipo: CeremonyMateKind;
  dateField: 'dataIniciacao' | 'dataElevacao' | 'dataExaltacao';
  origemField: 'origemIniciacaoMemberIds' | 'origemElevacaoMemberIds' | 'origemExaltacaoMemberIds';
}[] = [
  { tipo: 'iniciacao', dateField: 'dataIniciacao', origemField: 'origemIniciacaoMemberIds' },
  { tipo: 'elevacao', dateField: 'dataElevacao', origemField: 'origemElevacaoMemberIds' },
  { tipo: 'exaltacao', dateField: 'dataExaltacao', origemField: 'origemExaltacaoMemberIds' },
];

/**
 * "Irmãos Gêmeos" — quem foi iniciado/elevado/exaltado na MESMA sessão que
 * este Irmão. Reaproveita o mesmo par "Evento do dia + ArchiveItem da
 * sessão" já usado na criação (`CreateInitiationArchiveItemUseCase` e
 * afins, via `origemIniciacaoMemberIds`/`origemElevacaoMemberIds`/
 * `origemExaltacaoMemberIds`) — sem precisar de nenhum índice ou campo
 * novo: para cada data maçônica preenchida do Irmão, procura o Evento
 * cadastrado naquele dia e, entre os itens vinculados a ele, o que tem o
 * Irmão no `origem*MemberIds` correspondente. Mesmo padrão de composição de
 * `getMemberJourneyCargos`/`getMemberJourneyCommittees` — função pura
 * reaproveitada tanto pelo perfil público da Central VL6
 * (`GetPublicMemberProfileUseCase`) quanto pela Pessoa do Acervo VL6
 * (`/acervo/pessoas/[memberId]`).
 *
 * Nunca inclui o próprio Irmão na lista de colegas retornada; uma sessão em
 * que ele foi o único participante (ou os demais já foram excluídos/
 * transferidos) simplesmente não aparece no resultado.
 */
export async function getCeremonyMates(
  deps: GetCeremonyMatesDeps,
  member: Member,
): Promise<CeremonyMatesGroup[]> {
  const groups: CeremonyMatesGroup[] = [];

  for (const { tipo, dateField, origemField } of CEREMONIES) {
    const data = member[dateField];
    if (!data) continue;

    const events = await deps.eventRepository.listInRange(
      member.tenantId,
      startOfDay(data),
      endOfDay(data),
    );

    let match: ArchiveItem | undefined;
    for (const event of events) {
      const items = await deps.archiveItemRepository.findByEventId(event.id);
      match = items.find((item) => item[origemField]?.includes(member.id));
      if (match) break;
    }
    if (!match) continue;

    const colegaIds = match[origemField]!.filter((id) => id !== member.id);
    if (colegaIds.length === 0) continue;

    const colegaMembers = await Promise.all(
      colegaIds.map((id) => deps.memberRepository.findById(id)),
    );
    const colegas: CeremonyMate[] = colegaMembers
      .filter((m): m is Member => m !== null && m.deletedAt === null)
      .map((m) => ({ memberId: m.id, nomeCompleto: m.nomeCompleto, fotoUrl: m.fotoUrl }));

    if (colegas.length > 0) {
      groups.push({ tipo, data, colegas });
    }
  }

  return groups;
}
