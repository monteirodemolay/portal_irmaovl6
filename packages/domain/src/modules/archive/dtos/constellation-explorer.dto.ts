/**
 * Constelação da Memória explorável — DTOs de leitura da rota geral
 * `/acervo/constelacao` (pacote de implantação fornecido pelo
 * Administrador). Distinto do `ArchiveRelation` (aresta editorial
 * cadastrada manualmente): aqui um nó pode representar qualquer entidade
 * já publicada no Acervo (Irmão, Evento, Gestão, Coleção, item), e uma
 * aresta pode ser tanto uma `ArchiveRelation` (`source: 'curated'`) quanto
 * uma conexão calculada a partir de campos canônicos já existentes
 * (`source: 'derived'`, ex.: `ArchiveItem.eventId`) — nunca persistida,
 * sempre recalculada na leitura (`GetConstellationRootsUseCase`/
 * `ExpandConstellationNodeUseCase`).
 */
export type ExplorerNodeKind =
  'root' | 'group' | 'archiveItem' | 'member' | 'boardTerm' | 'event' | 'archiveCollection';

export interface ExplorerNode {
  /** Chave estável `${kind}:${id}` — evita colisão entre entidades de tipos diferentes com o mesmo id. */
  key: string;
  id: string;
  kind: ExplorerNodeKind;
  label: string;
  kindLabel: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  href: string | null;
  childCount: number;
  expandable: boolean;
}

export interface ExplorerEdge {
  id: string;
  sourceKey: string;
  targetKey: string;
  relationType: string;
  relationLabel: string;
  source: 'curated' | 'derived';
}

export interface ExplorerExpansion {
  center: ExplorerNode;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  nextCursor: string | null;
}

export interface ExpandNodeInput {
  kind: ExplorerNodeKind;
  id: string;
  cursor?: string | null;
}
