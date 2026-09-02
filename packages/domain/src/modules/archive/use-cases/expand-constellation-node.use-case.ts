import {
  ARCHIVE_ITEM_TYPE_LABELS,
  ARCHIVE_RELATION_NODE_KIND_LABELS,
  ARCHIVE_RELATION_TYPE_LABELS,
  type ArchiveItemTypeKey,
  type ArchiveRelationNodeKind,
} from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { hasPermission, requirePermission } from '../../../shared/auth-context';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IArchiveRelationRepository } from '../repositories/archive-relation.repository';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { Event } from '../../agenda/entities/event.entity';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { Member } from '../../membership/entities/member.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type {
  ExpandNodeInput,
  ExplorerEdge,
  ExplorerExpansion,
  ExplorerNode,
} from '../dtos/constellation-explorer.dto';
import { mergeConstellationEdges } from '../lib/merge-constellation-edges';

export interface ExpandConstellationNodeDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  archiveRelationRepository: IArchiveRelationRepository;
  archiveCollectionRepository: IArchiveCollectionRepository;
  memberRepository: IMemberRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
}

/** Teto de leitura por chamada de expansão — nunca monta todas as relações do tenant de uma vez (item "Desempenho" do pedido). */
const SCAN_LIMIT = 1000;
/** Filhos por página de expansão — item "Prevenção de excesso visual" do pedido. */
const PAGE_SIZE = 12;

const COMPOSITE_ARCHIVE_ITEM_PREFIX = 'archive-item_';

/**
 * Expande um nó da Constelação da Memória explorável sob demanda — camada
 * de leitura que combina relações editoriais (`ArchiveRelation`, sempre
 * `curated`) com relações calculadas a partir de campos canônicos já
 * existentes (`ArchiveItem.eventId`/`boardTermId`, `ArchiveMedia.
 * pessoasIdentificadas`, `ArchiveCollection.itemIds` — sempre `derived`,
 * nunca persistidas). Quando as duas coincidem, só a `curated` aparece
 * (`mergeConstellationEdges`).
 *
 * Cada `kind` de nó sabe montar seus próprios vizinhos; grupos (`group`)
 * paginam a listagem plana da entidade correspondente. Visibilidade segue
 * o mesmo critério das páginas individuais do Acervo: só item publicado,
 * e `nivelAcesso: 'administracao'` só pra quem tem `archiveItem:manage`.
 */
export class ExpandConstellationNodeUseCase {
  constructor(private readonly deps: ExpandConstellationNodeDeps) {}

  async execute(ctx: AuthContext, input: ExpandNodeInput): Promise<Result<ExplorerExpansion>> {
    requirePermission(ctx, 'archiveRelation:read');
    const canSeeAdminOnly = hasPermission(ctx, 'archiveItem:manage');

    if (input.kind === 'group') {
      return this.expandGroup(ctx, input.id, input.cursor ?? null, canSeeAdminOnly);
    }

    switch (input.kind) {
      case 'archiveItem':
        return this.expandArchiveItem(ctx, input.id, canSeeAdminOnly);
      case 'member':
        return this.expandMember(ctx, input.id, canSeeAdminOnly);
      case 'event':
        return this.expandEvent(ctx, input.id, canSeeAdminOnly);
      case 'boardTerm':
        return this.expandBoardTerm(ctx, input.id, canSeeAdminOnly);
      case 'archiveCollection':
        return this.expandArchiveCollection(ctx, input.id, canSeeAdminOnly);
      default:
        return err(new NotFoundError('ExplorerNode', input.id));
    }
  }

  private async expandGroup(
    ctx: AuthContext,
    groupId: string,
    cursor: string | null,
    canSeeAdminOnly: boolean,
  ): Promise<Result<ExplorerExpansion>> {
    const offset = Number(cursor ?? 0) || 0;

    if (groupId === 'member') {
      const page = await this.deps.memberRepository.search(
        { tenantId: ctx.tenantId },
        { limit: PAGE_SIZE, cursor: cursor ?? undefined },
      );
      return ok({
        center: groupCenterNode(groupId, 'Pessoas'),
        nodes: page.items.map((m) => memberNode(m)),
        edges: [],
        nextCursor: page.hasMore ? (page.nextCursor ?? null) : null,
      });
    }

    if (groupId === 'event') {
      const page = await this.deps.eventRepository.listAll(ctx.tenantId, {
        limit: PAGE_SIZE,
        cursor: cursor ?? undefined,
      });
      return ok({
        center: groupCenterNode(groupId, 'Eventos'),
        nodes: page.items.map((e) => eventNode(e)),
        edges: [],
        nextCursor: page.hasMore ? (page.nextCursor ?? null) : null,
      });
    }

    if (groupId === 'boardTerm') {
      const all = await this.deps.boardTermRepository.listByTenant(ctx.tenantId);
      const slice = all.slice(offset, offset + PAGE_SIZE);
      return ok({
        center: groupCenterNode(groupId, 'Gestões'),
        nodes: slice.map((t) => boardTermNode(t)),
        edges: [],
        nextCursor: offset + PAGE_SIZE < all.length ? String(offset + PAGE_SIZE) : null,
      });
    }

    if (groupId === 'archiveCollection') {
      const all = canSeeAdminOnly
        ? await this.deps.archiveCollectionRepository.listByTenant(ctx.tenantId)
        : await this.deps.archiveCollectionRepository.listPublishedByTenant(ctx.tenantId);
      const slice = all.slice(offset, offset + PAGE_SIZE);
      return ok({
        center: groupCenterNode(groupId, 'Coleções'),
        nodes: slice.map((c) => collectionNode(c)),
        edges: [],
        nextCursor: offset + PAGE_SIZE < all.length ? String(offset + PAGE_SIZE) : null,
      });
    }

    if (groupId.startsWith('archiveItem:')) {
      const tipo = groupId.slice('archiveItem:'.length) as ArchiveItemTypeKey;
      const page = await this.deps.archiveItemRepository.findByTenant(ctx.tenantId, {
        limit: SCAN_LIMIT,
      });
      const visible = page.items.filter(
        (item) =>
          item.tipo === tipo &&
          item.publicacaoStatus === 'publicado' &&
          (canSeeAdminOnly || item.nivelAcesso !== 'administracao'),
      );
      const slice = visible.slice(offset, offset + PAGE_SIZE);
      return ok({
        center: groupCenterNode(groupId, ARCHIVE_ITEM_TYPE_LABELS[tipo] ?? groupId),
        nodes: slice.map((item) => archiveItemNode(item)),
        edges: [],
        nextCursor: offset + PAGE_SIZE < visible.length ? String(offset + PAGE_SIZE) : null,
      });
    }

    return err(new NotFoundError('ExplorerNode', groupId));
  }

  private async expandArchiveItem(
    ctx: AuthContext,
    id: string,
    canSeeAdminOnly: boolean,
  ): Promise<Result<ExplorerExpansion>> {
    const item = await this.deps.archiveItemRepository.findById(id);
    if (
      !item ||
      item.tenantId !== ctx.tenantId ||
      item.deletedAt ||
      item.publicacaoStatus !== 'publicado' ||
      (item.nivelAcesso === 'administracao' && !canSeeAdminOnly)
    ) {
      return err(new NotFoundError('ArchiveItem', id));
    }

    const derived: ExplorerEdge[] = [];
    const nodes: ExplorerNode[] = [];
    const centerKey = `archiveItem:${item.id}`;

    const [event, boardTerm, media] = await Promise.all([
      this.deps.eventRepository.findById(item.eventId),
      item.boardTermId ? this.deps.boardTermRepository.findById(item.boardTermId) : null,
      this.deps.archiveMediaRepository.findByArchiveItemId(item.id),
    ]);

    if (event && event.tenantId === ctx.tenantId) {
      nodes.push(eventNode(event));
      derived.push(
        buildEdge(centerKey, `event:${event.id}`, 'ocorreu_durante', 'Ocorreu durante este evento'),
      );
    }
    if (boardTerm && boardTerm.tenantId === ctx.tenantId) {
      nodes.push(boardTermNode(boardTerm));
      derived.push(
        buildEdge(centerKey, `boardTerm:${boardTerm.id}`, 'pertence_a', 'Pertence a esta Gestão'),
      );
    }

    const memberIds = [...new Set(media.flatMap((m) => m.pessoasIdentificadas ?? []))];
    const members = await Promise.all(
      memberIds.map((mid) => this.deps.memberRepository.findById(mid)),
    );
    for (const member of members) {
      if (!member || member.tenantId !== ctx.tenantId) continue;
      nodes.push(memberNode(member));
      derived.push(
        buildEdge(
          centerKey,
          `member:${member.id}`,
          'retrata',
          'Pessoa identificada em mídia deste item',
        ),
      );
    }

    const { nodes: curatedNodes, edges: curated } = await this.resolveCuratedNeighbors(
      ctx,
      'archiveItem',
      item.id,
      centerKey,
    );
    nodes.push(...curatedNodes);

    return ok({
      center: archiveItemNode(item),
      nodes: dedupeNodes(nodes),
      edges: mergeConstellationEdges(derived, curated),
      nextCursor: null,
    });
  }

  private async expandMember(
    ctx: AuthContext,
    id: string,
    canSeeAdminOnly: boolean,
  ): Promise<Result<ExplorerExpansion>> {
    const member = await this.deps.memberRepository.findById(id);
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', id));
    }

    const centerKey = `member:${member.id}`;
    const media = await this.deps.archiveMediaRepository.findByPessoaIdentificada(
      ctx.tenantId,
      member.id,
    );
    const itemIds = [...new Set(media.map((m) => m.archiveItemId))];
    const items = await Promise.all(
      itemIds.map((iid) => this.deps.archiveItemRepository.findById(iid)),
    );

    const derived: ExplorerEdge[] = [];
    const nodes: ExplorerNode[] = [];
    for (const item of items) {
      if (
        !item ||
        item.tenantId !== ctx.tenantId ||
        item.deletedAt ||
        item.publicacaoStatus !== 'publicado' ||
        (item.nivelAcesso === 'administracao' && !canSeeAdminOnly)
      ) {
        continue;
      }
      nodes.push(archiveItemNode(item));
      derived.push(
        buildEdge(centerKey, `archiveItem:${item.id}`, 'retrata', 'Identificado nesta mídia'),
      );
    }

    const { nodes: curatedNodes, edges: curated } = await this.resolveCuratedNeighbors(
      ctx,
      'member',
      member.id,
      centerKey,
    );
    nodes.push(...curatedNodes);

    return ok({
      center: memberNode(member),
      nodes: dedupeNodes(nodes),
      edges: mergeConstellationEdges(derived, curated),
      nextCursor: null,
    });
  }

  private async expandEvent(
    ctx: AuthContext,
    id: string,
    canSeeAdminOnly: boolean,
  ): Promise<Result<ExplorerExpansion>> {
    const event = await this.deps.eventRepository.findById(id);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', id));
    }

    const centerKey = `event:${event.id}`;
    const items = await this.deps.archiveItemRepository.findByEventId(event.id);
    const derived: ExplorerEdge[] = [];
    const nodes: ExplorerNode[] = [];

    for (const item of items) {
      if (
        item.deletedAt ||
        item.publicacaoStatus !== 'publicado' ||
        (item.nivelAcesso === 'administracao' && !canSeeAdminOnly)
      ) {
        continue;
      }
      nodes.push(archiveItemNode(item));
      derived.push(
        buildEdge(
          centerKey,
          `archiveItem:${item.id}`,
          'ocorreu_durante',
          'Item registrado neste evento',
        ),
      );
    }

    if (event.boardTermId) {
      const boardTerm = await this.deps.boardTermRepository.findById(event.boardTermId);
      if (boardTerm && boardTerm.tenantId === ctx.tenantId) {
        nodes.push(boardTermNode(boardTerm));
        derived.push(
          buildEdge(
            centerKey,
            `boardTerm:${boardTerm.id}`,
            'ocorreu_durante',
            'Ocorreu durante esta Gestão',
          ),
        );
      }
    }

    const { nodes: curatedNodes, edges: curated } = await this.resolveCuratedNeighbors(
      ctx,
      'event',
      event.id,
      centerKey,
    );
    nodes.push(...curatedNodes);

    return ok({
      center: eventNode(event),
      nodes: dedupeNodes(nodes),
      edges: mergeConstellationEdges(derived, curated),
      nextCursor: null,
    });
  }

  private async expandBoardTerm(
    ctx: AuthContext,
    id: string,
    canSeeAdminOnly: boolean,
  ): Promise<Result<ExplorerExpansion>> {
    const boardTerm = await this.deps.boardTermRepository.findById(id);
    if (!boardTerm || boardTerm.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('BoardTerm', id));
    }

    const centerKey = `boardTerm:${boardTerm.id}`;
    const [itemsPage, eventsPage] = await Promise.all([
      this.deps.archiveItemRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.eventRepository.listAll(ctx.tenantId, { limit: SCAN_LIMIT }),
    ]);

    const derived: ExplorerEdge[] = [];
    const nodes: ExplorerNode[] = [];

    for (const item of itemsPage.items) {
      if (
        item.boardTermId !== boardTerm.id ||
        item.deletedAt ||
        item.publicacaoStatus !== 'publicado' ||
        (item.nivelAcesso === 'administracao' && !canSeeAdminOnly)
      ) {
        continue;
      }
      nodes.push(archiveItemNode(item));
      derived.push(
        buildEdge(
          centerKey,
          `archiveItem:${item.id}`,
          'pertence_a',
          'Item vinculado a esta Gestão',
        ),
      );
    }

    for (const event of eventsPage.items) {
      if (event.boardTermId !== boardTerm.id) continue;
      nodes.push(eventNode(event));
      derived.push(
        buildEdge(
          centerKey,
          `event:${event.id}`,
          'ocorreu_durante',
          'Evento realizado durante esta Gestão',
        ),
      );
    }

    const { nodes: curatedNodes, edges: curated } = await this.resolveCuratedNeighbors(
      ctx,
      'boardTerm',
      boardTerm.id,
      centerKey,
    );
    nodes.push(...curatedNodes);

    return ok({
      center: boardTermNode(boardTerm),
      nodes: dedupeNodes(nodes).slice(0, PAGE_SIZE * 2),
      edges: mergeConstellationEdges(derived, curated),
      nextCursor: null,
    });
  }

  private async expandArchiveCollection(
    ctx: AuthContext,
    id: string,
    canSeeAdminOnly: boolean,
  ): Promise<Result<ExplorerExpansion>> {
    const collection = await this.deps.archiveCollectionRepository.findById(id);
    if (
      !collection ||
      collection.tenantId !== ctx.tenantId ||
      (!collection.publicado && !canSeeAdminOnly)
    ) {
      return err(new NotFoundError('ArchiveCollection', id));
    }

    const centerKey = `archiveCollection:${collection.id}`;
    const archiveItemIds = collection.itemIds
      .filter((compositeId) => compositeId.startsWith(COMPOSITE_ARCHIVE_ITEM_PREFIX))
      .map((compositeId) => compositeId.slice(COMPOSITE_ARCHIVE_ITEM_PREFIX.length));

    const items = await Promise.all(
      archiveItemIds.map((itemId) => this.deps.archiveItemRepository.findById(itemId)),
    );

    const derived: ExplorerEdge[] = [];
    const nodes: ExplorerNode[] = [];
    for (const item of items) {
      if (
        !item ||
        item.tenantId !== ctx.tenantId ||
        item.deletedAt ||
        item.publicacaoStatus !== 'publicado' ||
        (item.nivelAcesso === 'administracao' && !canSeeAdminOnly)
      ) {
        continue;
      }
      nodes.push(archiveItemNode(item));
      derived.push(
        buildEdge(centerKey, `archiveItem:${item.id}`, 'pertence_a', 'Pertence a esta Coleção'),
      );
    }

    const { nodes: curatedNodes, edges: curated } = await this.resolveCuratedNeighbors(
      ctx,
      'archiveCollection',
      collection.id,
      centerKey,
    );
    nodes.push(...curatedNodes);

    return ok({
      center: collectionNode(collection),
      nodes: dedupeNodes(nodes),
      edges: mergeConstellationEdges(derived, curated),
      nextCursor: null,
    });
  }

  /** Relações editoriais (`ArchiveRelation`, sempre `curated`) em que o nó aparece como origem ou destino. */
  private async resolveCuratedNeighbors(
    ctx: AuthContext,
    kind: ArchiveRelationNodeKind,
    id: string,
    centerKey: string,
  ): Promise<{ nodes: ExplorerNode[]; edges: ExplorerEdge[] }> {
    const relations = await this.deps.archiveRelationRepository.listByNode(ctx.tenantId, kind, id);
    const nodes: ExplorerNode[] = [];
    const edges: ExplorerEdge[] = [];

    for (const relation of relations) {
      const isSource = relation.origemTipo === kind && relation.origemId === id;
      const other = isSource
        ? { tipo: relation.destinoTipo, id: relation.destinoId }
        : { tipo: relation.origemTipo, id: relation.origemId };
      const otherNode = await this.resolveNode(ctx, other.tipo, other.id);
      if (!otherNode) continue;
      nodes.push(otherNode);
      edges.push({
        id: relation.id,
        sourceKey: centerKey,
        targetKey: otherNode.key,
        relationType: relation.tipo,
        relationLabel: relation.descricao || ARCHIVE_RELATION_TYPE_LABELS[relation.tipo],
        source: 'curated',
      });
    }

    return { nodes, edges };
  }

  private async resolveNode(
    ctx: AuthContext,
    kind: ArchiveRelationNodeKind,
    id: string,
  ): Promise<ExplorerNode | null> {
    switch (kind) {
      case 'archiveItem': {
        const item = await this.deps.archiveItemRepository.findById(id);
        if (!item || item.tenantId !== ctx.tenantId || item.deletedAt) return null;
        return archiveItemNode(item);
      }
      case 'member': {
        const member = await this.deps.memberRepository.findById(id);
        if (!member || member.tenantId !== ctx.tenantId) return null;
        return memberNode(member);
      }
      case 'boardTerm': {
        const term = await this.deps.boardTermRepository.findById(id);
        if (!term || term.tenantId !== ctx.tenantId) return null;
        return boardTermNode(term);
      }
      case 'event': {
        const event = await this.deps.eventRepository.findById(id);
        if (!event || event.tenantId !== ctx.tenantId) return null;
        return eventNode(event);
      }
      case 'archiveCollection': {
        const collection = await this.deps.archiveCollectionRepository.findById(id);
        if (!collection || collection.tenantId !== ctx.tenantId) return null;
        return collectionNode(collection);
      }
    }
  }
}

function buildEdge(
  sourceKey: string,
  targetKey: string,
  relationType: string,
  relationLabel: string,
): ExplorerEdge {
  return {
    id: `${sourceKey}>${targetKey}>${relationType}`,
    sourceKey,
    targetKey,
    relationType,
    relationLabel,
    source: 'derived',
  };
}

function groupCenterNode(groupId: string, label: string): ExplorerNode {
  return {
    key: `group:${groupId}`,
    id: groupId,
    kind: 'group',
    label,
    kindLabel: 'Grupo',
    subtitle: null,
    thumbnailUrl: null,
    href: null,
    childCount: 0,
    expandable: true,
    date: null,
  };
}

function archiveItemNode(item: ArchiveItem): ExplorerNode {
  return {
    key: `archiveItem:${item.id}`,
    id: item.id,
    kind: 'archiveItem',
    label: item.titulo,
    kindLabel: ARCHIVE_ITEM_TYPE_LABELS[item.tipo] ?? ARCHIVE_RELATION_NODE_KIND_LABELS.archiveItem,
    subtitle: item.descricao,
    thumbnailUrl: null,
    href: `/acervo/item/archive-item_${item.id}`,
    childCount: 0,
    expandable: true,
    date: null,
  };
}

function memberNode(member: Member): ExplorerNode {
  return {
    key: `member:${member.id}`,
    id: member.id,
    kind: 'member',
    label: member.nomeCompleto,
    kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.member,
    subtitle: null,
    thumbnailUrl: member.fotoUrl ?? null,
    href: `/acervo/pessoas/${member.id}`,
    childCount: 0,
    expandable: true,
    date: null,
  };
}

function boardTermNode(term: BoardTerm): ExplorerNode {
  return {
    key: `boardTerm:${term.id}`,
    id: term.id,
    kind: 'boardTerm',
    label: term.nome,
    kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.boardTerm,
    subtitle: null,
    thumbnailUrl: null,
    href: `/acervo/gestoes/${term.id}`,
    childCount: 0,
    expandable: true,
    date: null,
  };
}

function eventNode(event: Event): ExplorerNode {
  return {
    key: `event:${event.id}`,
    id: event.id,
    kind: 'event',
    label: event.titulo,
    kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.event,
    subtitle: event.local,
    thumbnailUrl: null,
    href: `/eventos/${event.id}`,
    childCount: 0,
    expandable: true,
    date: event.dataInicio,
  };
}

function collectionNode(collection: ArchiveCollection): ExplorerNode {
  return {
    key: `archiveCollection:${collection.id}`,
    id: collection.id,
    kind: 'archiveCollection',
    label: collection.titulo,
    kindLabel: ARCHIVE_RELATION_NODE_KIND_LABELS.archiveCollection,
    subtitle: null,
    thumbnailUrl: collection.capaUrl,
    href: `/acervo/colecoes/${collection.slug}`,
    childCount: 0,
    expandable: true,
    date: null,
  };
}

function dedupeNodes(nodes: ExplorerNode[]): ExplorerNode[] {
  return Array.from(new Map(nodes.map((n) => [n.key, n])).values());
}
