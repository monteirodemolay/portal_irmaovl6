'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ExpandNodeInput, ExplorerEdge, ExplorerNode } from '@vl6/domain';
import { Badge, Button, Compass, Input, RotateCcw, Search } from '@vl6/ui';
import { expandConstellationNodeAction } from '../actions/constellation-explorer-actions';

export interface InteractiveConstellationExplorerProps {
  roots: ExplorerNode[];
}

type BranchState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  nodes: ExplorerNode[];
  /** Rótulo do vínculo de cada filho com este nó (`ExplorerEdge.targetKey` -> rótulo) — "Por que está conectado?". */
  edgeLabels: Record<string, { label: string; source: 'curated' | 'derived' }>;
  nextCursor?: string | null;
  message?: string;
};

/**
 * Explorador progressivo da Constelação da Memória — pedido do
 * Administrador (PACOTE_CONSTELACAO_EXPLORAVEL_VL6): árvore semântica em
 * HTML puro (nunca canvas/SVG decorativo), então a estrutura já é
 * acessível a leitor de tela sem precisar de uma "versão em lista"
 * paralela pra manter sincronizada. Clique em qualquer nó expande seus
 * vizinhos dentro da própria tela — nunca navega sozinho; só o botão
 * explícito "Abrir registro" sai pra página completa.
 *
 * Não usa nenhuma biblioteca de grafo (item 12 do pedido) — React + estado
 * local + os componentes de `@vl6/ui` já existentes bastam pro
 * comportamento pedido (expandir, recolher, paginar, buscar).
 */
export function InteractiveConstellationExplorer({ roots }: InteractiveConstellationExplorerProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<ExplorerNode | null>(null);
  const [branches, setBranches] = React.useState<Record<string, BranchState>>({});
  const [query, setQuery] = React.useState('');

  const loadBranch = React.useCallback(
    async (node: ExplorerNode, append = false) => {
      if (!node.expandable) {
        setSelected(node);
        return;
      }

      const current = branches[node.key];
      setSelected(node);
      setBranches((value) => ({
        ...value,
        [node.key]: {
          status: 'loading',
          nodes: append ? (value[node.key]?.nodes ?? []) : [],
          edgeLabels: append ? (value[node.key]?.edgeLabels ?? {}) : {},
        },
      }));

      try {
        const input: ExpandNodeInput = {
          kind: node.kind,
          id: node.id,
          cursor: append ? current?.nextCursor : null,
        };
        const result = await expandConstellationNodeAction(input);
        setBranches((value) => ({
          ...value,
          [node.key]: {
            status: 'ready',
            nodes: append
              ? deduplicateNodes([...(value[node.key]?.nodes ?? []), ...result.nodes])
              : result.nodes,
            edgeLabels: append
              ? { ...(value[node.key]?.edgeLabels ?? {}), ...edgeLabelsByTarget(result.edges) }
              : edgeLabelsByTarget(result.edges),
            nextCursor: result.nextCursor,
          },
        }));
      } catch {
        setBranches((value) => ({
          ...value,
          [node.key]: {
            status: 'error',
            nodes: value[node.key]?.nodes ?? [],
            edgeLabels: value[node.key]?.edgeLabels ?? {},
            message: 'Não foi possível abrir este ramo.',
          },
        }));
      }
    },
    [branches],
  );

  const toggleNode = React.useCallback(
    (node: ExplorerNode) => {
      const branch = branches[node.key];
      setSelected(node);
      if (branch?.status === 'ready' || branch?.status === 'error') {
        setBranches((value) => {
          const next = { ...value };
          delete next[node.key];
          return next;
        });
        return;
      }
      void loadBranch(node);
    },
    [branches, loadBranch],
  );

  const collapseAll = React.useCallback(() => {
    setBranches({});
    setSelected(null);
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label="Explorador da Constelação" className="min-w-0">
        <div className="border-border bg-surface rounded-xl border p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-sm font-semibold">Acervo VL6</p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por título ou nome…"
                  className="h-9 w-56 pl-8 text-sm"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
                <RotateCcw size={14} className="mr-1.5" />
                Recolher tudo
              </Button>
            </div>
          </div>

          {roots.length === 0 ? (
            <p className="text-muted py-6 text-center text-sm">
              Nenhum grupo com conteúdo publicado ainda.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filterRoots(roots, query).map((node) => (
                <ExplorerBranch
                  key={node.key}
                  node={node}
                  branches={branches}
                  selectedKey={selected?.key}
                  query={query}
                  onToggle={toggleNode}
                  onLoadMore={(item) => void loadBranch(item, true)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside
        aria-label="Detalhes do registro"
        className="border-border bg-surface h-fit rounded-xl border p-4"
      >
        {selected ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">
              {selected.kindLabel}
            </p>
            <h2 className="font-display text-lg font-semibold">{selected.label}</h2>
            {selected.subtitle && <p className="text-muted text-sm">{selected.subtitle}</p>}
            {selected.childCount > 0 && (
              <p className="text-muted text-sm">{selected.childCount} vínculo(s) disponível(is)</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {selected.expandable && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleNode(selected)}
                >
                  {branches[selected.key] ? 'Recolher vínculos' : 'Expandir vínculos'}
                </Button>
              )}
              {selected.href && (
                <Button type="button" size="sm" onClick={() => router.push(selected.href!)}>
                  Abrir registro
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted flex items-center gap-2 text-sm">
            <Compass size={16} className="shrink-0" />
            Selecione um grupo ou registro para ver seus detalhes e vínculos.
          </p>
        )}
      </aside>
    </div>
  );
}

interface ExplorerBranchProps {
  node: ExplorerNode;
  branches: Record<string, BranchState>;
  selectedKey?: string;
  query: string;
  onToggle: (node: ExplorerNode) => void;
  onLoadMore: (node: ExplorerNode) => void;
}

function ExplorerBranch({
  node,
  branches,
  selectedKey,
  query,
  onToggle,
  onLoadMore,
}: ExplorerBranchProps) {
  const branch = branches[node.key];
  const isOpen = Boolean(branch);
  const edgeInfo = branch?.edgeLabels?.[node.key];

  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-expanded={node.expandable ? isOpen : undefined}
        aria-current={selectedKey === node.key ? 'true' : undefined}
        className="border-border hover:border-accent aria-[current=true]:border-accent flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors"
        onClick={() => onToggle(node)}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{node.label}</span>
          <span className="text-muted block text-xs">{node.kindLabel}</span>
          {edgeInfo && (
            <span className="text-muted mt-0.5 block truncate text-[11px] italic">
              {edgeInfo.label}
              {edgeInfo.source === 'curated' ? ' · confirmado' : ' · automático'}
            </span>
          )}
        </span>
        {node.childCount > 0 && (
          <Badge variant="outline" className="shrink-0">
            {node.childCount}
          </Badge>
        )}
      </button>

      {branch && (
        <div className="border-border ml-4 border-l pl-3">
          {branch.status === 'loading' && (
            <p role="status" className="text-muted py-3 text-sm">
              Abrindo ramo…
            </p>
          )}
          {branch.status === 'error' && (
            <div className="py-3 text-sm">
              <p role="alert" className="text-destructive">
                {branch.message}
              </p>
              <button
                type="button"
                className="text-accent mt-2 underline"
                onClick={() => onToggle(node)}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {branch.status === 'ready' && branch.nodes.length === 0 && (
            <p className="text-muted py-3 text-sm">Nenhum vínculo encontrado.</p>
          )}
          {branch.status === 'ready' && branch.nodes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {filterNodes(branch.nodes, query).map((child) => (
                <ExplorerBranch
                  key={child.key}
                  node={child}
                  branches={branches}
                  selectedKey={selectedKey}
                  query={query}
                  onToggle={onToggle}
                  onLoadMore={onLoadMore}
                />
              ))}
            </ul>
          )}
          {branch.status === 'ready' && branch.nextCursor && (
            <button
              type="button"
              className="text-accent my-3 text-sm font-medium underline"
              onClick={() => onLoadMore(node)}
            >
              Mostrar mais
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function deduplicateNodes(nodes: ExplorerNode[]) {
  return Array.from(new Map(nodes.map((node) => [node.key, node])).values());
}

function edgeLabelsByTarget(
  edges: ExplorerEdge[],
): Record<string, { label: string; source: 'curated' | 'derived' }> {
  const map: Record<string, { label: string; source: 'curated' | 'derived' }> = {};
  for (const edge of edges) {
    map[edge.targetKey] = { label: edge.relationLabel, source: edge.source };
  }
  return map;
}

function filterRoots(nodes: ExplorerNode[], query: string): ExplorerNode[] {
  if (!query.trim()) return nodes;
  return nodes;
}

function filterNodes(nodes: ExplorerNode[], query: string): ExplorerNode[] {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  if (!normalized) return nodes;
  return nodes.filter((node) => node.label.toLocaleLowerCase('pt-BR').includes(normalized));
}
