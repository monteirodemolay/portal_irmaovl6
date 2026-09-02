import { ARCHIVE_ITEM_TYPE_LABELS, type ArchiveItemTypeKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { hasPermission, requirePermission } from '../../../shared/auth-context';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { ExplorerNode } from '../dtos/constellation-explorer.dto';

export interface GetConstellationRootsDeps {
  archiveItemRepository: IArchiveItemRepository;
  memberRepository: IMemberRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  archiveCollectionRepository: IArchiveCollectionRepository;
}

export interface ConstellationRoots {
  root: ExplorerNode;
  groups: ExplorerNode[];
}

/** Teto de leitura por chamada — ver `ExpandConstellationNodeUseCase` para o mesmo raciocínio de escala. */
const SCAN_LIMIT = 1000;

const ITEM_GROUP_TYPES: ArchiveItemTypeKey[] = ['fotografia', 'documento', 'audiovisual'];

/**
 * Tela inicial da Constelação da Memória explorável — raiz `Acervo VL6` +
 * grupos com contadores (Pessoas, Fotografias, Documentos, Audiovisuais,
 * Eventos, Gestões, Coleções), pedido do Administrador
 * (PACOTE_CONSTELACAO_EXPLORAVEL_VL6). Nunca depende de `ArchiveRelation`
 * cadastrada manualmente — cada grupo é uma contagem direta sobre o
 * conteúdo já publicado do Acervo, então a tela deixa de ficar vazia só
 * porque ninguém cadastrou relações ainda.
 *
 * Grupo sem conteúdo é omitido (item "Experiência inicial" do pedido) —
 * nunca mostra "Fotografias (0)" à toa.
 */
export class GetConstellationRootsUseCase {
  constructor(private readonly deps: GetConstellationRootsDeps) {}

  async execute(ctx: AuthContext): Promise<ConstellationRoots> {
    requirePermission(ctx, 'archiveRelation:read');
    const canSeeAdminOnly = hasPermission(ctx, 'archiveItem:manage');

    const [itemsPage, memberCount, eventsPage, boardTerms, collections] = await Promise.all([
      this.deps.archiveItemRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.memberRepository.countByTenant(ctx.tenantId),
      this.deps.eventRepository.listAll(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.boardTermRepository.listByTenant(ctx.tenantId),
      canSeeAdminOnly
        ? this.deps.archiveCollectionRepository.listByTenant(ctx.tenantId)
        : this.deps.archiveCollectionRepository.listPublishedByTenant(ctx.tenantId),
    ]);

    const visibleItems = itemsPage.items.filter(
      (item) =>
        item.publicacaoStatus === 'publicado' &&
        (canSeeAdminOnly || item.nivelAcesso !== 'administracao'),
    );

    const groups: ExplorerNode[] = [];

    if (memberCount > 0) {
      groups.push(
        buildGroupNode('member', 'Pessoas', 'Irmãos com registro no Acervo', memberCount),
      );
    }

    for (const tipo of ITEM_GROUP_TYPES) {
      const count = visibleItems.filter((item) => item.tipo === tipo).length;
      if (count > 0) {
        groups.push(
          buildGroupNode(
            `archiveItem:${tipo}`,
            ARCHIVE_ITEM_TYPE_LABELS[tipo],
            `Itens do tipo ${ARCHIVE_ITEM_TYPE_LABELS[tipo].toLowerCase()}`,
            count,
          ),
        );
      }
    }

    if (eventsPage.items.length > 0) {
      groups.push(
        buildGroupNode('event', 'Eventos', 'Sessões e eventos da Loja', eventsPage.items.length),
      );
    }
    if (boardTerms.length > 0) {
      groups.push(
        buildGroupNode(
          'boardTerm',
          'Gestões',
          'Gestões administrativas da Loja',
          boardTerms.length,
        ),
      );
    }
    if (collections.length > 0) {
      groups.push(
        buildGroupNode(
          'archiveCollection',
          'Coleções',
          'Coleções editoriais do Acervo',
          collections.length,
        ),
      );
    }

    const root: ExplorerNode = {
      key: 'root:acervo-vl6',
      id: 'acervo-vl6',
      kind: 'root',
      label: 'Acervo VL6',
      kindLabel: 'Raiz',
      subtitle: null,
      thumbnailUrl: null,
      href: null,
      childCount: groups.length,
      expandable: groups.length > 0,
      date: null,
    };

    return { root, groups };
  }
}

function buildGroupNode(
  groupId: string,
  label: string,
  subtitle: string,
  count: number,
): ExplorerNode {
  return {
    key: `group:${groupId}`,
    id: groupId,
    kind: 'group',
    label,
    kindLabel: 'Grupo',
    subtitle,
    thumbnailUrl: null,
    href: null,
    childCount: count,
    expandable: count > 0,
    date: null,
  };
}
