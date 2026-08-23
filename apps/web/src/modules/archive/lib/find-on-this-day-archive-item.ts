import 'server-only';
import type { AuthContext, Role } from '@vl6/domain';
import { hasPermission } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { isAccessLevelVisible } from './access-level-visibility';

export interface OnThisDayResult {
  eventId: string;
  titulo: string;
  local: string;
  anosAtras: number;
  coverSrc: string | null;
}

/**
 * "Aconteceu neste dia" — card do Dashboard (proposta fora do pedido
 * original, Fase A "Pessoas & Descoberta"). Procura, entre os eventos já
 * realizados do tenant, o mais recente cujo dia/mês bate com hoje e que
 * tenha algum `ArchiveItem` publicado — se nenhum bater, retorna `null` e o
 * card simplesmente não aparece (nunca mostra uma seção vazia).
 *
 * Filtra em memória sobre a lista de eventos já carregada (mesmo padrão já
 * usado em `/acervo/eventos` e `/acervo/linha-do-tempo`) — o volume
 * esperado (algumas centenas de eventos por década de uma única Loja) não
 * justifica uma consulta dedicada.
 */
export async function findOnThisDayArchiveItem(
  container: ServerContainer,
  authContext: AuthContext,
  role: Role | null,
  today: Date = new Date(),
): Promise<OnThisDayResult | null> {
  if (!hasPermission(authContext, 'event:read') || !hasPermission(authContext, 'archiveItem:read')) {
    return null;
  }

  const eventsPage = await container.useCases.listAllEvents.execute(authContext, { limit: 200 });

  const candidates = eventsPage.items
    .filter((event) => {
      const date = new Date(event.dataInicio);
      if (date >= today) return false;
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    })
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());

  const session = { authenticated: true, role };

  for (const event of candidates) {
    const items = await container.repositories.archiveItem.findByEventId(event.id);
    const published = items.find(
      (item) => item.publicacaoStatus === 'publicado' && isAccessLevelVisible(item.nivelAcesso, session),
    );
    if (!published) continue;

    const medias = await container.repositories.archiveMedia.findByArchiveItemId(published.id);
    const visibleMedias = medias.filter(
      (media) => media.publicacaoStatus === 'publicado' && isAccessLevelVisible(media.accessLevel, session),
    );
    const cover = visibleMedias.find((media) => media.isCover) ?? visibleMedias[0] ?? null;

    return {
      eventId: event.id,
      titulo: event.titulo,
      local: event.local,
      anosAtras: today.getFullYear() - new Date(event.dataInicio).getFullYear(),
      coverSrc: cover ? `/api/archive-media/${cover.id}` : null,
    };
  }

  return null;
}
