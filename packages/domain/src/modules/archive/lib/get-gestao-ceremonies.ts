import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { Member } from '../../membership/entities/member.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { CeremonyMateKind } from './get-ceremony-mates';

export interface GestaoCeremonyMember {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
}

export interface GestaoCeremonyGroup {
  tipo: CeremonyMateKind;
  eventId: string;
  eventTitulo: string;
  data: Date;
  membros: GestaoCeremonyMember[];
}

export interface GetGestaoCeremoniesDeps {
  archiveItemRepository: IArchiveItemRepository;
  eventRepository: IEventRepository;
  memberRepository: IMemberRepository;
}

const ORIGEM_FIELDS: {
  tipo: CeremonyMateKind;
  origemField: 'origemIniciacaoMemberIds' | 'origemElevacaoMemberIds' | 'origemExaltacaoMemberIds';
}[] = [
  { tipo: 'iniciacao', origemField: 'origemIniciacaoMemberIds' },
  { tipo: 'elevacao', origemField: 'origemElevacaoMemberIds' },
  { tipo: 'exaltacao', origemField: 'origemExaltacaoMemberIds' },
];

/**
 * Iniciação/Elevação/Exaltação que aconteceram durante uma Gestão — todo
 * `ArchiveItem` com `boardTermId` desta Gestão (preenchido na criação a
 * partir da Gestão vigente na data do Evento, ver `ArchiveItem.boardTermId`)
 * que tenha algum `origem*MemberIds` preenchido. Usado pela página da
 * Gestão (`/acervo/gestoes/[gestaoId]`) pra fechar o laço com "Onde
 * aconteceu" do Perfil do Irmão: um mesmo Evento pode gerar mais de um
 * grupo (ex.: Iniciação e Elevação na mesma sessão, itens distintos).
 */
export async function getGestaoCeremonies(
  deps: GetGestaoCeremoniesDeps,
  boardTermId: string,
): Promise<GestaoCeremonyGroup[]> {
  const items = await deps.archiveItemRepository.findByBoardTermId(boardTermId);
  const groups: GestaoCeremonyGroup[] = [];

  for (const item of items) {
    const event = await deps.eventRepository.findById(item.eventId);
    if (!event) continue;

    for (const { tipo, origemField } of ORIGEM_FIELDS) {
      const memberIds = getOrigemIds(item, origemField);
      if (memberIds.length === 0) continue;

      const members = await Promise.all(memberIds.map((id) => deps.memberRepository.findById(id)));
      const membros: GestaoCeremonyMember[] = members
        .filter((m): m is Member => m !== null && m.deletedAt === null)
        .map((m) => ({ memberId: m.id, nomeCompleto: m.nomeCompleto, fotoUrl: m.fotoUrl }));

      if (membros.length > 0) {
        groups.push({ tipo, eventId: event.id, eventTitulo: event.titulo, data: event.dataInicio, membros });
      }
    }
  }

  return groups.sort((a, b) => a.data.getTime() - b.data.getTime());
}

function getOrigemIds(
  item: ArchiveItem,
  field: 'origemIniciacaoMemberIds' | 'origemElevacaoMemberIds' | 'origemExaltacaoMemberIds',
): string[] {
  return item[field] ?? [];
}
