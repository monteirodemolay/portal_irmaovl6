'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogTitle, Search } from '@vl6/ui';
import {
  MIN_RECORD_QUERY,
  searchLocal,
  type AdminSearchHit,
  type LocalSearchSource,
} from '../lib/admin-search';
import { PORTAL_SURFACES } from '../lib/portal-surfaces';

export interface PaletteTool {
  href: string;
  label: string;
  group: string;
  description?: string;
}

/**
 * Janela de busca global da Administração (Ctrl+K / ⌘K, ou o botão da barra
 * superior). Encontra ferramentas e seções do Portal na hora; Irmãos,
 * Acontecimentos e Notícias vêm do servidor, já filtrados pelo perfil.
 */
export function AdminCommandPalette({ tools }: { tools: PaletteTool[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<AdminSearchHit[]>([]);
  const [partial, setPartial] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [active, setActive] = useState(0);
  const listId = 'admin-search-results';
  const requestId = useRef(0);

  const sources = useMemo<LocalSearchSource[]>(() => {
    const allowed = new Set(tools.map((tool) => tool.href));
    return [
      ...tools.map((tool) => ({
        kind: 'Ferramenta' as const,
        title: tool.label,
        detail: tool.description ?? tool.group,
        href: tool.href,
      })),
      ...PORTAL_SURFACES.filter((surface) => allowed.has(surface.feedHref)).map((surface) => ({
        kind: 'Seção do Portal' as const,
        title: surface.label,
        detail: `Alimentar em ${surface.feedLabel}`,
        href: surface.feedHref,
        keywords: surface.keywords,
      })),
    ];
  }, [tools]);

  const local = useMemo(() => searchLocal(sources, query), [sources, query]);
  const results = useMemo(() => [...local, ...records], [local, records]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const term = query.trim();
    const current = ++requestId.current;
    if (term.length < MIN_RECORD_QUERY) {
      setRecords([]);
      setPartial([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`);
        if (!response.ok) throw new Error('falha');
        const body = (await response.json()) as {
          hits: AdminSearchHit[];
          partial: string[];
          truncated?: boolean;
        };
        if (current !== requestId.current) return;
        setRecords(body.hits);
        setTruncated(Boolean(body.truncated));
        setPartial(body.partial);
        setFailed(false);
      } catch {
        if (current === requestId.current) {
          setRecords([]);
          setFailed(true);
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => setActive(0), [query, records.length]);

  const go = useCallback(
    (hit: AdminSearchHit) => {
      setOpen(false);
      setQuery('');
      router.push(hit.href);
    },
    [router],
  );

  function onInputKey(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active]!);
    }
  }

  const statusText = loading
    ? 'Buscando registros…'
    : query.trim().length < MIN_RECORD_QUERY
      ? 'Digite ao menos 2 letras.'
      : `${results.length} resultado(s).`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-surface text-muted hover:border-accent flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"
        aria-label="Buscar na Administração (Ctrl+K)"
      >
        <Search size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="border-border hidden rounded border px-1.5 text-[11px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-xl translate-y-0 p-0 sm:p-0">
          <div className="border-border border-b p-4 pr-12">
            <DialogTitle className="sr-only">Buscar na Administração</DialogTitle>
            <DialogDescription className="sr-only">
              Encontre ferramentas, seções do Portal, Irmãos, acontecimentos e notícias.
            </DialogDescription>
            <input
              autoFocus
              type="text"
              inputMode="search"
              autoComplete="off"
              role="combobox"
              aria-label="Buscar na Administração"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKey}
              placeholder="Ferramenta, Irmão, acontecimento, notícia…"
              className="w-full bg-transparent text-base outline-none"
            />
          </div>
          <p className="text-muted px-4 pt-2 text-xs" role="status" aria-live="polite">
            {statusText}
          </p>
          <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.map((hit, index) => (
              <li
                key={hit.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
              >
                <button
                  type="button"
                  onClick={() => go(hit)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                    index === active ? 'bg-accent/10' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{hit.title}</span>
                    {hit.detail && (
                      <span className="text-muted block truncate text-xs">{hit.detail}</span>
                    )}
                  </span>
                  <span className="border-border text-muted shrink-0 rounded-full border px-2 py-0.5 text-[11px]">
                    {hit.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {query.trim().length >= MIN_RECORD_QUERY && !loading && results.length === 0 && (
            <p className="text-muted px-4 pb-4 text-sm">Nada encontrado para “{query.trim()}”.</p>
          )}
          {(failed || partial.length > 0) && (
            <p role="alert" className="mx-4 mb-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
              {failed
                ? 'Não foi possível buscar registros agora; ferramentas continuam disponíveis.'
                : `Sem resposta de: ${partial.join(', ')}. Os demais resultados são válidos.`}
            </p>
          )}
          {truncated && (
            <p className="text-muted border-border border-t px-4 py-2 text-[11px]">
              Busca em acontecimentos e notícias limitada aos 3.000 registros mais recentes de cada
              tipo. Para mais antigos, use os filtros em Acontecimentos.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
