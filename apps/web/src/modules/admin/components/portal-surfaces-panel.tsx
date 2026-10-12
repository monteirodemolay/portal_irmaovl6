'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { normalizeForSearch } from '@vl6/shared';
import { ArrowUpRight, Eye, Search } from '@vl6/ui';
import type { OverviewModule } from '../lib/dashboard-overview-model';
import {
  PORTAL_SURFACES,
  resolveSurfaceCounts,
  surfaceStatus,
  type PortalSurfaceGroup,
  type PortalSurfaceMode,
} from '../lib/portal-surfaces';

const MODE_LABEL: Record<PortalSurfaceMode, string> = {
  manual: 'Manual',
  automatico: 'Automático',
  misto: 'Misto',
};

const TONE: Record<'ok' | 'atencao' | 'neutro', string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  atencao: 'border-amber-300 bg-amber-50 text-amber-900',
  neutro: 'border-border bg-surface text-muted',
};

const number = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat('pt-BR').format(value);

/**
 * "Vitrine do Portal": para cada seção que o Irmão enxerga, mostra quanto
 * está visível, quanto espera publicação e onde alimentar. Não consulta nada
 * a mais: reaproveita as métricas já carregadas pela Central de Controle.
 */
export function PortalSurfacesPanel({
  modules,
  allowedHrefs,
}: {
  modules: OverviewModule[];
  /** Ferramentas que a sessão pode abrir (mesmas de `data.tools`). */
  allowedHrefs: string[];
}) {
  const [query, setQuery] = useState('');
  const [onlyAttention, setOnlyAttention] = useState(false);

  const metrics = useMemo(
    () =>
      new Map(
        modules.flatMap((module) => module.metrics).map((metric) => [metric.key, metric.value]),
      ),
    [modules],
  );
  const allowed = useMemo(() => new Set(allowedHrefs), [allowedHrefs]);

  const rows = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    return PORTAL_SURFACES.map((surface) => {
      const canFeed = allowed.has(surface.feedHref);
      const counts = resolveSurfaceCounts(surface, metrics);
      return { surface, canFeed, counts, status: surfaceStatus(surface, counts, canFeed) };
    }).filter(({ surface, status }) => {
      if (onlyAttention && status.tone !== 'atencao') return false;
      if (!needle) return true;
      return normalizeForSearch(
        [surface.label, surface.feedLabel, surface.how, ...(surface.keywords ?? [])].join(' '),
      ).includes(needle);
    });
  }, [allowed, metrics, onlyAttention, query]);

  const attention = PORTAL_SURFACES.filter((surface) => {
    const canFeed = allowed.has(surface.feedHref);
    return (
      surfaceStatus(surface, resolveSurfaceCounts(surface, metrics), canFeed).tone === 'atencao'
    );
  }).length;

  const groups = [...new Set(rows.map((row) => row.surface.group))] as PortalSurfaceGroup[];

  return (
    <section
      className="border-border bg-surface rounded-2xl border p-5 sm:p-6"
      aria-labelledby="vitrine-portal"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-semibold uppercase tracking-widest">
            Portal × Administração
          </p>
          <h2 id="vitrine-portal" className="font-display mt-1 text-xl font-semibold">
            O que o Portal mostra e onde alimentar
          </h2>
          <p className="text-muted mt-1 text-xs">
            Cada linha é uma seção que o Irmão vê. Use “Ver no Portal” para conferir e “Alimentar”
            para cadastrar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block">
            <span className="sr-only">Filtrar seções do Portal</span>
            <Search
              size={15}
              aria-hidden="true"
              className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Notícias, honrarias, livros…"
              className="border-border bg-surface min-h-11 w-56 rounded-lg border py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <button
            type="button"
            aria-pressed={onlyAttention}
            onClick={() => setOnlyAttention((value) => !value)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-medium ${
              onlyAttention ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-border'
            }`}
          >
            Só o que precisa de atenção ({attention})
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <div key={group}>
            <h3 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
              {group}
            </h3>
            <ul className="divide-border border-border divide-y overflow-hidden rounded-xl border">
              {rows
                .filter((row) => row.surface.group === group)
                .map(({ surface, canFeed, counts, status }) => (
                  <li
                    key={surface.key}
                    className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1.4fr)_auto_auto] sm:items-center sm:p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{surface.label}</strong>
                        <span className="border-border text-muted rounded-full border px-2 py-0.5 text-[11px]">
                          {MODE_LABEL[surface.mode]}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[status.tone]}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-muted mt-1 text-xs leading-relaxed">{surface.how}</p>
                      {surface.gap && (
                        <p className="mt-1 text-xs leading-relaxed text-amber-900">
                          Lacuna: {surface.gap}
                        </p>
                      )}
                    </div>

                    <dl className="flex gap-5 text-right sm:min-w-36 sm:justify-end">
                      {surface.visibleMetric && (
                        <div>
                          <dt className="text-muted text-[11px]">No Portal</dt>
                          <dd className="font-display text-lg font-semibold tabular-nums">
                            {number(counts.visible)}
                          </dd>
                        </div>
                      )}
                      {counts.hidden !== null && (
                        <div>
                          <dt className="text-muted text-[11px]">Aguardando</dt>
                          <dd className="font-display text-lg font-semibold tabular-nums">
                            {number(counts.hidden)}
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Link
                        href={surface.publicHref}
                        className="border-border hover:border-accent inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
                      >
                        <Eye size={14} aria-hidden="true" />
                        Ver no Portal
                      </Link>
                      {canFeed ? (
                        <Link
                          href={surface.feedHref}
                          className="bg-primary inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white"
                        >
                          Alimentar: {surface.feedLabel}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </Link>
                      ) : (
                        <span className="text-muted inline-flex min-h-11 items-center px-1 text-xs">
                          Requer outro perfil
                        </span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-muted text-sm">Nenhuma seção corresponde a este filtro.</p>
        )}
      </div>
    </section>
  );
}
