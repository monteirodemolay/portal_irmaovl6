import 'server-only';
import type { AuthContext, Role } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import type { ArchiveRelationNodeKind } from '@vl6/shared';
import { buildArchiveItemId, type ArchiveItemKind } from './archive-item-id';
import { loadArchiveSearchResults, type ArchiveSearchKind } from './search-archive';

export interface RelationNodeOption {
  tipo: ArchiveRelationNodeKind;
  id: string;
  label: string;
}

const ARCHIVE_ITEM_KIND_BY_SEARCH_KIND: Record<
  Exclude<ArchiveSearchKind, 'evento'>,
  ArchiveItemKind
> = {
  documento: 'file',
  biblioteca: 'library',
  fotografia: 'gallery-album',
};

/**
 * Opções para o seletor de nós da Constelação da Memória
 * (`/admin/acervo/relacoes/nova`) — mesma fonte de dados já usada em cada
 * área (membros, gestões, eventos, coleções, itens do Acervo), sem
 * duplicar nenhum registro.
 */
export async function loadRelationNodeOptions(
  authContext: AuthContext,
  container: ServerContainer,
  role: Role | null = null,
): Promise<RelationNodeOption[]> {
  const [membersPage, boardTerms, eventsPage, collections, archiveItems] = await Promise.all([
    container.useCases.searchMembers.execute(authContext, {}, { limit: 500 }),
    container.repositories.boardTerm.listByTenant(authContext.tenantId),
    container.useCases.listAllEvents.execute(authContext, { limit: 200 }),
    container.useCases.listArchiveCollections.execute(authContext),
    loadArchiveSearchResults(authContext, container, role),
  ]);

  const memberOptions: RelationNodeOption[] = membersPage.items.map((member) => ({
    tipo: 'member',
    id: member.id,
    label: member.nomeCompleto,
  }));

  const boardTermOptions: RelationNodeOption[] = boardTerms.map((term) => ({
    tipo: 'boardTerm',
    id: term.id,
    label: term.nome,
  }));

  const eventOptions: RelationNodeOption[] = eventsPage.items.map((event) => ({
    tipo: 'event',
    id: event.id,
    label: event.titulo,
  }));

  const collectionOptions: RelationNodeOption[] = collections.map((collection) => ({
    tipo: 'archiveCollection',
    id: collection.id,
    label: collection.titulo,
  }));

  // Itens do Acervo novo (kind 'evento') já entram na Constelação como nó
  // 'event' (mesmo Evento, ID canônico) — não têm mapeamento de ID
  // composto legado, e criar um segundo nó pro mesmo evento duplicaria a
  // Constelação sem necessidade.
  const archiveItemOptions: RelationNodeOption[] = archiveItems
    .filter((item): item is typeof item & { kind: Exclude<ArchiveSearchKind, 'evento'> } =>
      item.kind !== 'evento',
    )
    .map((item) => ({
      tipo: 'archiveItem',
      id: buildArchiveItemId(ARCHIVE_ITEM_KIND_BY_SEARCH_KIND[item.kind], item.id),
      label: item.title,
    }));

  return [
    ...memberOptions,
    ...boardTermOptions,
    ...eventOptions,
    ...collectionOptions,
    ...archiveItemOptions,
  ];
}
