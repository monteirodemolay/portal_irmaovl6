import type { Event } from '../../agenda/entities/event.entity';
import type { Member } from '../../membership/entities/member.entity';
import type { ArchiveItem } from '../entities/archive-item.entity';
import {
  CEREMONY_ORIGEM_FIELD,
  type CeremonyMateKind,
  type GetCeremonyMatesDeps,
} from './get-ceremony-mates';

const CEREMONIES = [
  { tipo: 'iniciacao', dateField: 'dataIniciacao', label: 'Iniciados neste dia' },
  { tipo: 'elevacao', dateField: 'dataElevacao', label: 'Elevados neste dia' },
  { tipo: 'exaltacao', dateField: 'dataExaltacao', label: 'Exaltados neste dia' },
] as const;

// Datas maçônicas são datas civis persistidas em UTC, sem conversão pelo fuso do servidor.
function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface EventCeremonyGroup {
  tipo: CeremonyMateKind;
  label: string;
  membros: Member[];
}

/** Completa vínculos legados na leitura, sem criar eventos nem alterar o Acervo. */
export async function getEventCeremonyMembers(
  deps: GetCeremonyMatesDeps,
  event: Event,
): Promise<EventCeremonyGroup[]> {
  if (event.deletedAt) return [];
  const date = day(event.dataInicio);
  const validItems = (items: ArchiveItem[]) =>
    items.filter((item) => item.tenantId === event.tenantId && !item.deletedAt);
  const items = validItems(await deps.archiveItemRepository.findByEventId(event.id));
  const ceremonies = CEREMONIES.filter(
    ({ tipo }) =>
      event.sessionNature === tipo ||
      items.some((item) => item[CEREMONY_ORIGEM_FIELD[tipo]]?.length),
  );
  if (!ceremonies.length) return [];

  const members: Member[] = [];
  let cursor: string | undefined;
  do {
    const page = await deps.memberRepository.search(
      { tenantId: event.tenantId },
      { limit: 100, cursor },
    );
    members.push(
      ...page.items.filter((member) => member.tenantId === event.tenantId && !member.deletedAt),
    );
    cursor = page.hasMore && page.nextCursor ? page.nextCursor : undefined;
  } while (cursor);

  const events = await deps.eventRepository.listInRange(
    event.tenantId,
    new Date(`${date}T00:00:00.000Z`),
    new Date(`${date}T23:59:59.999Z`),
  );
  const otherSessions = await Promise.all(
    events
      .filter(
        (candidate) =>
          candidate.id !== event.id &&
          candidate.tenantId === event.tenantId &&
          !candidate.deletedAt &&
          candidate.tipo === 'sessao',
      )
      .map(async (candidate) => ({
        event: candidate,
        items: validItems(await deps.archiveItemRepository.findByEventId(candidate.id)),
      })),
  );

  return ceremonies
    .map(({ tipo, dateField, label }) => {
      const field = CEREMONY_ORIGEM_FIELD[tipo];
      const explicitIds = new Set(items.flatMap((item) => item[field] ?? []));
      // Duas sessões compatíveis no mesmo dia: só os vínculos explícitos são seguros.
      const ambiguous = otherSessions.some(
        (candidate) =>
          candidate.event.sessionNature === tipo ||
          candidate.items.some((item) => item[field]?.length),
      );
      const membros = members.filter((member) => {
        const memberDate = member[dateField];
        // Uma correção de data no cadastro invalida o vínculo antigo imediatamente.
        if (memberDate && day(memberDate) !== date) return false;
        if (explicitIds.has(member.id)) return true;
        return event.tipo === 'sessao' && !ambiguous && Boolean(memberDate);
      });
      return {
        tipo,
        label,
        membros: [...new Map(membros.map((member) => [member.id, member])).values()].sort((a, b) =>
          a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'),
        ),
      };
    })
    .filter((group) => group.membros.length > 0);
}
