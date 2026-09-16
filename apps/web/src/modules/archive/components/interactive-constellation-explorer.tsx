'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type {
  ConstellationView,
  ExpandNodeInput,
  ExplorerEdge,
  ExplorerExpansion,
  ExplorerNode,
  ExplorerNodeKind,
} from '@vl6/domain';
import {
  Badge,
  Bookmark,
  Button,
  CheckCircle2,
  Compass,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EyeOff,
  Info,
  Input,
  Label,
  Link2,
  Maximize2,
  Minimize2,
  Pin,
  Play,
  RotateCcw,
  Save,
  Search,
  Select,
  Sparkles,
  Star,
  Textarea,
  X,
  cn,
} from '@vl6/ui';
import {
  deleteConstellationViewAction,
  getConstellationViewAction,
  listMyConstellationViewsAction,
  saveConstellationViewAction,
} from '../actions/constellation-view-actions';

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

const LEAF_KINDS: ExplorerNodeKind[] = [
  'member',
  'event',
  'boardTerm',
  'archiveCollection',
  'archiveItem',
];

const LEAF_KIND_LABELS: Record<ExplorerNodeKind, string> = {
  root: 'Raiz',
  group: 'Grupo',
  member: 'Pessoas',
  event: 'Eventos',
  boardTerm: 'Gestões',
  archiveCollection: 'Coleções',
  archiveItem: 'Itens do Acervo',
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
 * Fase 2 ("Meu quadro"): fixar/ocultar nós, filtrar por tipo/período, ver
 * "Por que está conectado?" e salvar/restaurar um recorte pessoal
 * versionado — nunca duplica nós/arestas, só o RECORTE (ver
 * `ConstellationView`). Por isso, ao abrir um quadro salvo antes de
 * navegar, os nós fixados/ocultos aparecem pela chave até serem
 * redescobertos nesta sessão (`discovered`).
 */
export function InteractiveConstellationExplorer({ roots }: InteractiveConstellationExplorerProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<ExplorerNode | null>(null);
  const [branches, setBranches] = React.useState<Record<string, BranchState>>({});
  const [query, setQuery] = React.useState('');
  const [fullScreen, setFullScreen] = React.useState(false);
  const [showGuide, setShowGuide] = React.useState(true);

  const [enabledKinds, setEnabledKinds] = React.useState<Set<ExplorerNodeKind>>(
    () => new Set(LEAF_KINDS),
  );
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [pinned, setPinned] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [discovered, setDiscovered] = React.useState<Record<string, ExplorerNode>>(() => {
    const map: Record<string, ExplorerNode> = {};
    for (const node of roots) map[node.key] = node;
    return map;
  });

  const [activeViewId, setActiveViewId] = React.useState<string | null>(null);
  const [activeViewName, setActiveViewName] = React.useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [viewsDialogOpen, setViewsDialogOpen] = React.useState(false);
  const [whyEdge, setWhyEdge] = React.useState<{
    label: string;
    source: 'curated' | 'derived';
  } | null>(null);

  const rememberNodes = React.useCallback((nodes: ExplorerNode[]) => {
    setDiscovered((value) => {
      const next = { ...value };
      for (const node of nodes) next[node.key] = node;
      return next;
    });
  }, []);

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
        // `fetch` comum, não Server Action — ver comentário da rota
        // `/api/acervo/constelacao/expandir` (evita o refresh implícito de
        // toda a árvore de Server Components da página a cada nó aberto).
        const response = await fetch('/api/acervo/constelacao/expandir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error('expand_failed');
        const result = (await response.json()) as ExplorerExpansion;
        rememberNodes(result.nodes);
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
    [branches, rememberNodes],
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

  const togglePin = React.useCallback((node: ExplorerNode) => {
    setPinned((value) => {
      const next = new Set(value);
      if (next.has(node.key)) next.delete(node.key);
      else next.add(node.key);
      return next;
    });
  }, []);

  const toggleHidden = React.useCallback((node: ExplorerNode) => {
    setHidden((value) => {
      const next = new Set(value);
      if (next.has(node.key)) next.delete(node.key);
      else next.add(node.key);
      return next;
    });
  }, []);

  const toggleKind = React.useCallback((kind: ExplorerNodeKind) => {
    setEnabledKinds((value) => {
      const next = new Set(value);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }, []);

  const nodePassesFilters = React.useCallback(
    (node: ExplorerNode) => {
      if (hidden.has(node.key)) return false;
      if (node.kind !== 'root' && node.kind !== 'group' && !enabledKinds.has(node.kind)) {
        return false;
      }
      if (node.date) {
        const date = new Date(node.date);
        if (dateFrom && date < new Date(dateFrom)) return false;
        if (dateTo && date > new Date(dateTo)) return false;
      }
      return true;
    },
    [hidden, enabledKinds, dateFrom, dateTo],
  );

  const applySavedView = React.useCallback((view: ConstellationView) => {
    setActiveViewId(view.id);
    setActiveViewName(view.nome);
    setPinned(new Set(view.pinnedNodeKeys));
    setHidden(new Set(view.hiddenNodeKeys));
    setEnabledKinds(
      view.filters.kinds && view.filters.kinds.length > 0
        ? new Set(view.filters.kinds)
        : new Set(LEAF_KINDS),
    );
    setDateFrom(view.filters.from ? toDateInputValue(view.filters.from) : '');
    setDateTo(view.filters.to ? toDateInputValue(view.filters.to) : '');
  }, []);

  const buildViewInput = React.useCallback(
    () => ({
      centerNodeKey: selected?.key ?? null,
      filters: {
        kinds: enabledKinds.size === LEAF_KINDS.length ? null : [...enabledKinds],
        from: dateFrom ? new Date(dateFrom) : null,
        to: dateTo ? new Date(dateTo) : null,
      },
      pinnedNodeKeys: [...pinned],
      hiddenNodeKeys: [...hidden],
    }),
    [selected, enabledKinds, dateFrom, dateTo, pinned, hidden],
  );

  const pinnedList = [...pinned].map((key) => discovered[key]);
  const hiddenList = [...hidden].map((key) => discovered[key]);
  const discoveredRecords = Object.values(discovered).filter(
    (node) => node.kind !== 'root' && node.kind !== 'group',
  ).length;
  const openedTrails = roots.filter((root) => branches[root.key]).length;

  const exploreSurprise = React.useCallback(() => {
    if (roots.length === 0) return;
    const unopened = roots.filter((root) => !branches[root.key]);
    const candidates = unopened.length > 0 ? unopened : roots;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (chosen) void loadBranch(chosen);
  }, [roots, branches, loadBranch]);

  return (
    <div
      className={cn(
        'grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]',
        fullScreen && 'bg-background fixed inset-0 z-50 grid-rows-[auto_1fr] overflow-auto p-4',
      )}
    >
      <section aria-label="Explorador da Constelação" className="min-w-0">
        {showGuide && (
          <div className="border-accent/30 bg-accent/5 mb-4 flex flex-col gap-4 rounded-[16px] border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="bg-primary text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Play size={17} fill="currentColor" />
              </div>
              <div>
                <p className="font-display font-semibold">Sua jornada começa pelo primeiro ponto</p>
                <p className="text-muted mt-1 max-w-2xl text-xs leading-5">
                  Abra uma trilha, escolha um registro e siga suas ligações. Fixe o que for
                  importante e salve o resultado como um quadro pessoal.
                </p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowGuide(false)}>
              Entendi, começar
            </Button>
          </div>
        )}

        <div className="border-border bg-surface overflow-hidden rounded-[18px] border shadow-sm">
          <div className="from-primary to-primary-dark grid gap-4 bg-gradient-to-r px-4 py-4 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-accent" size={17} />
                <p className="font-display font-semibold">Mesa de exploração</p>
                {activeViewName && (
                  <Badge className="border-white/20 bg-white/10 text-white">
                    <Bookmark size={11} className="mr-1" /> {activeViewName}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-white/60">
                {openedTrails} de {roots.length} trilhas abertas · {discoveredRecords} registros
                descobertos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={exploreSurprise}
              >
                <Star size={14} className="text-accent mr-1.5" />
                Surpreenda-me
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setFullScreen((value) => !value)}
              >
                {fullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="ml-1.5 hidden sm:inline">
                  {fullScreen ? 'Sair da tela cheia' : 'Tela cheia'}
                </span>
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-muted text-xs font-semibold uppercase tracking-wider">
                Escolha uma trilha
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <Dialog open={viewsDialogOpen} onOpenChange={setViewsDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Bookmark size={14} className="mr-1.5" />
                    Meus quadros
                  </Button>
                </DialogTrigger>
                <MyViewsDialogContent
                  open={viewsDialogOpen}
                  onApply={applySavedView}
                  onClose={() => setViewsDialogOpen(false)}
                />
              </Dialog>
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm">
                    <Save size={14} className="mr-1.5" />
                    Salvar meu quadro
                  </Button>
                </DialogTrigger>
                <SaveViewDialogContent
                  open={saveDialogOpen}
                  activeViewId={activeViewId}
                  activeViewName={activeViewName}
                  buildInput={buildViewInput}
                  onSaved={(view) => {
                    setActiveViewId(view.id);
                    setActiveViewName(view.nome);
                    setSaveDialogOpen(false);
                  }}
                />
              </Dialog>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 border-t border-dashed pt-3">
            <span className="text-muted text-xs font-semibold">Mostrar:</span>
            {LEAF_KINDS.map((kind) => (
              <label key={kind} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={enabledKinds.has(kind)}
                  onChange={() => toggleKind(kind)}
                />
                {LEAF_KIND_LABELS[kind]}
              </label>
            ))}
            <span className="text-muted ml-2 text-xs font-semibold">Período:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-border h-7 rounded border px-1.5 text-xs"
              aria-label="De"
            />
            <span className="text-muted text-xs">até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-border h-7 rounded border px-1.5 text-xs"
              aria-label="Até"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="text-accent text-xs underline"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Limpar período
              </button>
            )}
          </div>

          {roots.length === 0 ? (
            <p className="text-muted py-6 text-center text-sm">
              Nenhum grupo com conteúdo publicado ainda.
            </p>
          ) : (
            <ul className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filterRoots(roots, query)
                .filter(nodePassesFilters)
                .map((node) => (
                  <ExplorerBranch
                    key={node.key}
                    node={node}
                    edgeInfo={null}
                    branches={branches}
                    selectedKey={selected?.key}
                    query={query}
                    pinned={pinned}
                    passesFilters={nodePassesFilters}
                    onToggle={toggleNode}
                    onLoadMore={(item) => void loadBranch(item, true)}
                    onTogglePin={togglePin}
                    onToggleHidden={toggleHidden}
                    onShowWhy={setWhyEdge}
                  />
                ))}
            </ul>
          )}
          </div>
        </div>
      </section>

      <aside
        aria-label="Detalhes do registro e quadro pessoal"
        className="border-border bg-surface flex h-fit flex-col gap-5 overflow-hidden rounded-[18px] border shadow-sm"
      >
        <div className="bg-primary px-5 py-4 text-white">
          <p className="text-accent text-[10px] font-semibold uppercase tracking-[0.2em]">
            Caderno de descobertas
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <strong className="font-display text-3xl">{discoveredRecords}</strong>
              <span className="ml-2 text-xs text-white/55">registros encontrados</span>
            </div>
            <Sparkles className="text-accent" size={22} />
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-accent h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (openedTrails / Math.max(roots.length, 1)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 pt-0">
        {selected ? (
          <div className="flex flex-col gap-3">
            {selected.thumbnailUrl && (
              <div className="border-border -mx-5 aspect-[16/8] overflow-hidden border-b">
                <img
                  src={selected.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
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
              <Button type="button" size="sm" variant="outline" onClick={() => togglePin(selected)}>
                <Pin size={13} className="mr-1" />
                {pinned.has(selected.key) ? 'Desafixar' : 'Fixar'}
              </Button>
              {selected.href && (
                <Button type="button" size="sm" onClick={() => router.push(selected.href!)}>
                  Abrir registro
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-3 text-center">
            <Compass size={28} className="text-accent mx-auto" strokeWidth={1.4} />
            <p className="font-display mt-3 font-semibold">Escolha seu primeiro ponto</p>
            <p className="text-muted mt-1 text-xs leading-5">
              Os detalhes, documentos e caminhos encontrados aparecerão aqui.
            </p>
          </div>
        )}

        <div className="border-border rounded-xl border p-3">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <Link2 size={14} className="text-accent" /> Como ler as ligações
          </p>
          <ul className="text-muted mt-2 space-y-1.5 text-[11px] leading-4">
            <li className="flex gap-2"><CheckCircle2 size={12} className="text-accent mt-0.5 shrink-0" /> Confirmado: relação registrada pela curadoria.</li>
            <li className="flex gap-2"><Sparkles size={12} className="text-accent mt-0.5 shrink-0" /> Automático: relação identificada nos dados do Acervo.</li>
          </ul>
        </div>

        {pinnedList.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
              Fixados ({pinnedList.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {pinnedList.map((node, i) => {
                const key = [...pinned][i]!;
                return (
                  <li key={key} className="flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      className="hover:text-accent truncate text-left"
                      onClick={() => node && setSelected(node)}
                    >
                      {node?.label ?? key}
                    </button>
                    <button
                      type="button"
                      aria-label="Desafixar"
                      onClick={() => setPinned((v) => new Set([...v].filter((k) => k !== key)))}
                    >
                      <X size={12} className="text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hiddenList.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
              Ocultos ({hiddenList.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {hiddenList.map((node, i) => {
                const key = [...hidden][i]!;
                return (
                  <li key={key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted truncate">{node?.label ?? key}</span>
                    <button
                      type="button"
                      className="text-accent underline"
                      onClick={() => setHidden((v) => new Set([...v].filter((k) => k !== key)))}
                    >
                      Reexibir
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        </div>
      </aside>

      <Dialog open={whyEdge !== null} onOpenChange={(open) => !open && setWhyEdge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Por que está conectado?</DialogTitle>
          </DialogHeader>
          {whyEdge && (
            <div className="flex flex-col gap-2 text-sm">
              <p>{whyEdge.label}</p>
              <p className="text-muted text-xs">
                {whyEdge.source === 'curated'
                  ? 'Vínculo cadastrado manualmente por um administrador — sempre prevalece sobre um vínculo automático equivalente.'
                  : 'Vínculo calculado automaticamente a partir de um campo já existente no cadastro (ex.: evento, gestão, pessoas identificadas em mídia).'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ExplorerBranchProps {
  node: ExplorerNode;
  edgeInfo: { label: string; source: 'curated' | 'derived' } | null;
  branches: Record<string, BranchState>;
  selectedKey?: string;
  query: string;
  pinned: Set<string>;
  passesFilters: (node: ExplorerNode) => boolean;
  onToggle: (node: ExplorerNode) => void;
  onLoadMore: (node: ExplorerNode) => void;
  onTogglePin: (node: ExplorerNode) => void;
  onToggleHidden: (node: ExplorerNode) => void;
  onShowWhy: (edge: { label: string; source: 'curated' | 'derived' }) => void;
}

function ExplorerBranch({
  node,
  edgeInfo,
  branches,
  selectedKey,
  query,
  pinned,
  passesFilters,
  onToggle,
  onLoadMore,
  onTogglePin,
  onToggleHidden,
  onShowWhy,
}: ExplorerBranchProps) {
  const branch = branches[node.key];
  const isOpen = Boolean(branch);
  const isPinned = pinned.has(node.key);

  return (
    <li className="min-w-0">
      <div
        className={cn(
          'border-border hover:border-accent aria-[current=true]:border-accent group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-xl border px-3 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md',
          node.kind === 'group' && 'min-h-[5.5rem] bg-gradient-to-br from-white to-slate-50',
          isOpen && 'border-accent bg-accent/5 shadow-sm',
          isPinned && 'border-accent bg-accent/5',
        )}
        aria-current={selectedKey === node.key ? 'true' : undefined}
      >
        <button
          type="button"
          aria-expanded={node.expandable ? isOpen : undefined}
          className="min-w-0 flex-1 text-left"
          onClick={() => onToggle(node)}
        >
          <span className="flex items-center gap-1.5">
            {isPinned && <Pin size={11} className="text-accent shrink-0" />}
            <span className="font-display block truncate text-sm font-semibold">{node.label}</span>
          </span>
          <span className="text-muted block text-xs">{node.kindLabel}</span>
          {edgeInfo && (
            <button
              type="button"
              className="text-muted mt-0.5 flex items-center gap-1 truncate text-[11px] italic underline decoration-dotted"
              onClick={(e) => {
                e.stopPropagation();
                onShowWhy(edgeInfo);
              }}
            >
              <Info size={10} />
              {edgeInfo.label}
              {edgeInfo.source === 'curated' ? ' · confirmado' : ' · automático'}
            </button>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {node.childCount > 0 && (
            <Badge variant="outline" className="shrink-0">
              {node.childCount}
            </Badge>
          )}
          <button
            type="button"
            aria-label={isPinned ? 'Desafixar' : 'Fixar'}
            className={cn('rounded p-1', isPinned ? 'text-accent' : 'text-muted hover:text-accent')}
            onClick={() => onTogglePin(node)}
          >
            <Pin size={13} />
          </button>
          <button
            type="button"
            aria-label="Ocultar"
            className="text-muted hover:text-destructive rounded p-1"
            onClick={() => onToggleHidden(node)}
          >
            <EyeOff size={13} />
          </button>
        </div>
      </div>

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
          {branch.status === 'ready' &&
            filterNodes(branch.nodes, query).filter(passesFilters).length === 0 && (
              <p className="text-muted py-3 text-sm">Nenhum vínculo encontrado.</p>
            )}
          {branch.status === 'ready' && branch.nodes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {filterNodes(branch.nodes, query)
                .filter(passesFilters)
                .map((child) => (
                  <ExplorerBranch
                    key={child.key}
                    node={child}
                    edgeInfo={branch.edgeLabels[child.key] ?? null}
                    branches={branches}
                    selectedKey={selectedKey}
                    query={query}
                    pinned={pinned}
                    passesFilters={passesFilters}
                    onToggle={onToggle}
                    onLoadMore={onLoadMore}
                    onTogglePin={onTogglePin}
                    onToggleHidden={onToggleHidden}
                    onShowWhy={onShowWhy}
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

function MyViewsDialogContent({
  open,
  onApply,
  onClose,
}: {
  open: boolean;
  onApply: (view: ConstellationView) => void;
  onClose: () => void;
}) {
  const [views, setViews] = React.useState<ConstellationView[] | null>(null);

  React.useEffect(() => {
    if (!open) return;
    void listMyConstellationViewsAction().then(setViews);
  }, [open]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Meus quadros</DialogTitle>
      </DialogHeader>
      {views === null ? (
        <p className="text-muted py-4 text-center text-sm">Carregando…</p>
      ) : views.length === 0 ? (
        <p className="text-muted py-4 text-center text-sm">
          Você ainda não salvou nenhum quadro pessoal.
        </p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {views.map((view) => (
            <li
              key={view.id}
              className="border-border flex items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{view.nome}</p>
                <p className="text-muted text-xs">
                  {view.visibility === 'shared' ? 'Compartilhado (só-leitura)' : 'Privado'} · v
                  {view.version}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const full = await getConstellationViewAction(view.id);
                    onApply(full);
                    onClose();
                  }}
                >
                  Abrir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await deleteConstellationViewAction(view.id);
                    setViews((value) => value?.filter((v) => v.id !== view.id) ?? null);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DialogContent>
  );
}

interface SaveViewInput {
  centerNodeKey: string | null;
  filters: { kinds: ExplorerNodeKind[] | null; from: Date | null; to: Date | null };
  pinnedNodeKeys: string[];
  hiddenNodeKeys: string[];
}

function SaveViewDialogContent({
  open,
  activeViewId,
  activeViewName,
  buildInput,
  onSaved,
}: {
  open: boolean;
  activeViewId: string | null;
  activeViewName: string | null;
  buildInput: () => SaveViewInput;
  onSaved: (view: ConstellationView) => void;
}) {
  const [nome, setNome] = React.useState(activeViewName ?? '');
  const [descricao, setDescricao] = React.useState('');
  const [visibility, setVisibility] = React.useState<'private' | 'shared'>('private');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setNome(activeViewName ?? '');
  }, [open, activeViewName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Dê um nome ao quadro.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const view = await saveConstellationViewAction(activeViewId, {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        visibility,
        ...buildInput(),
      });
      onSaved(view);
    } catch {
      setError('Não foi possível salvar o quadro.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{activeViewId ? 'Atualizar meu quadro' : 'Salvar meu quadro'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="constellation-view-nome">Nome</Label>
          <Input
            id="constellation-view-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Minha família na Loja"
          />
        </div>
        <div>
          <Label htmlFor="constellation-view-descricao">Descrição (opcional)</Label>
          <Textarea
            id="constellation-view-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="constellation-view-visibility">Visibilidade</Label>
          <Select
            id="constellation-view-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'private' | 'shared')}
          >
            <option value="private">Privado — só eu vejo</option>
            <option value="shared">Compartilhado — qualquer Irmão com link vê, só-leitura</option>
          </Select>
        </div>
        {error && <p className="text-destructive text-xs">{error}</p>}
        <DialogFooter>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : activeViewId ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
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

function toDateInputValue(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
