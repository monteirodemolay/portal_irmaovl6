import type { BaseEntity } from '../../../shared/base-entity';
import type { ExplorerNodeKind } from '../dtos/constellation-explorer.dto';

export type ConstellationViewVisibility = 'private' | 'shared';

/** `kinds: null` = sem filtro de tipo (mostra tudo); `from`/`to: null` = sem recorte de período. */
export interface ConstellationViewFilters {
  kinds: ExplorerNodeKind[] | null;
  from: Date | null;
  to: Date | null;
}

/**
 * "Meu quadro" — recorte pessoal e salvo da Constelação da Memória
 * explorável (item "quadro personalizável e rastreável" do pacote de
 * implantação). Guarda só o RECORTE (nó central, filtros, nós fixados/
 * ocultos) — nunca duplica os nós/arestas em si, que continuam sempre
 * recalculados na leitura por `GetConstellationRootsUseCase`/
 * `ExpandConstellationNodeUseCase`. `visibility: 'shared'` permite abrir o
 * quadro em modo só-leitura por um link, sem exigir que o visitante seja o
 * dono. Toda alteração estrutural (criar/atualizar/restaurar) grava uma
 * `ConstellationViewRevision` — histórico de versões pra restaurar/auditar.
 */
export interface ConstellationView extends BaseEntity {
  ownerId: string;
  nome: string;
  descricao: string | null;
  centerNodeKey: string | null;
  filters: ConstellationViewFilters;
  pinnedNodeKeys: string[];
  hiddenNodeKeys: string[];
  visibility: ConstellationViewVisibility;
  version: number;
}

/** Snapshot imutável de um `ConstellationView` num momento — nunca editado, só criado. */
export interface ConstellationViewRevision {
  id: string;
  tenantId: string;
  viewId: string;
  version: number;
  nome: string;
  descricao: string | null;
  centerNodeKey: string | null;
  filters: ConstellationViewFilters;
  pinnedNodeKeys: string[];
  hiddenNodeKeys: string[];
  createdAt: Date;
  createdBy: string;
}
