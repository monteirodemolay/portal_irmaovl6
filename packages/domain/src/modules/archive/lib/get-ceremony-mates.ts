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
 * Acha, para uma data maçônica do Irmão, o `ArchiveItem` da sessão
 * correspondente (Evento do dia + item com o Irmão no `origem*MemberIds`
 * certo) — núcleo compartilhado por `getCeremonyMates` (que só se importa
 * com os colegas) e `getMemberCeremonyEventIds` (que só se importa com o
 * `eventId`, mesmo quando o Irmão foi o único participante da sessão).
 */
async function findCeremonyArchiveItem(
  deps: Pick<GetCeremonyMatesDeps, 'archiveItemRepository' | 'eventRepository'>,
  tenantId: string,
  memberId: string,
  data: Date,
  origemField: (typeof CEREMONIES)[number]['origemField'],
): Promise<{ eventId: string; item: ArchiveItem } | null> {
  const events = await deps.eventRepository.listInRange(tenantId, startOfDay(data), endOfDay(data));
  for (const event of events) {
    const items = await deps.archiveItemRepository.findByEventId(event.id);
    const match = items.find((item) => item[origemField]?.includes(memberId));
    if (match) return { eventId: event.id, item: match };
  }
  return null;
}

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

    const found = await findCeremonyArchiveItem(
      deps,
      member.tenantId,
      member.id,
      data,
      origemField,
    );
    if (!found) continue;
    const { item: match } = found;

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

export type MemberCeremonyEventIds = Partial<Record<CeremonyMateKind, string>>;

/**
 * Acha o `eventId` do Evento onde cada data maçônica do Irmão (Iniciação/
 * Elevação/Exaltação) aconteceu — usado pra tornar essas entradas da
 * "Trajetória institucional"/"Caminho na Loja" clicáveis, levando direto
 * pro Acervo do Evento daquele dia. Ao contrário de `getCeremonyMates`,
 * devolve o vínculo mesmo quando o Irmão foi o único participante da
 * sessão (não depende de haver colega) — chaves ausentes do mapa de
 * retorno significam "nenhum Evento/ArchiveItem encontrado pra essa data"
 * (nunca gera erro, a Trajetória simplesmente mostra a entrada sem link).
 */
export async function getMemberCeremonyEventIds(
  deps: Pick<GetCeremonyMatesDeps, 'archiveItemRepository' | 'eventRepository'>,
  member: Member,
): Promise<MemberCeremonyEventIds> {
  const result: MemberCeremonyEventIds = {};

  for (const { tipo, dateField, origemField } of CEREMONIES) {
    const data = member[dateField];
    if (!data) continue;

    const found = await findCeremonyArchiveItem(deps, member.tenantId, member.id, data, origemField);
    if (found) result[tipo] = found.eventId;
  }

  return result;
}
