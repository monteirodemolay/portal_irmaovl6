'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { filterEditorialItems, editorialDate } from './publication-filters';

export interface EditorialItem {
  id: string;
  createdAt?: string | null;
  title: string;
  type: string;
  status: string;
  href: string;
  eventId: string | null;
  happenedAt: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
  destination: string;
}

export interface EditorialLink {
  href: string;
  label: string;
}

type EventGroup = {
  event: EditorialItem;
  related: EditorialItem[];
  hasPublishedMemory: boolean;
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(value))
    : 'Data não informada';

const dayKey = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

function statusTone(status: string) {
  const normalized = status.toLocaleLowerCase('pt-BR');
  if (normalized.includes('public')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (normalized.includes('rascunho')) return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function PublicationCenter({
  items,
  createLinks,
  errors,
}: {
  items: EditorialItem[];
  createLinks: EditorialLink[];
  errors: string[];
}) {
  const primaryCreate = createLinks.find((link) => link.href === '/admin/publicacoes/novo');
  const [view, setView] = useState<'painel' | 'lista' | 'calendario'>('painel');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [year, setYear] = useState('Todos');
  const [order, setOrder] = useState('newest');
  const [month, setMonth] = useState(() => dayKey(new Date().toISOString()).slice(0, 7));

  const filtered = filterEditorialItems(items, { query, type, status, year, order });
  const filteredIds = new Set(filtered.map((item) => item.id));
  const now = Date.now();

  const groups = useMemo<EventGroup[]>(() => {
    const events = items.filter((item) => item.type === 'Acontecimento');
    return events
      .map((event) => {
        const related = items.filter(
          (item) => item.id !== event.id && item.eventId === event.eventId,
        );
        return {
          event,
          related,
          hasPublishedMemory: related.some(
            (item) =>
              item.type === 'Acervo' &&
              item.status.toLocaleLowerCase('pt-BR').includes('public'),
          ),
        };
      })
      .filter((group) => filteredIds.has(group.event.id) || group.related.some((item) => filteredIds.has(item.id)))
      .sort((a, b) => {
        const aTime = a.event.happenedAt ? new Date(a.event.happenedAt).getTime() : 0;
        const bTime = b.event.happenedAt ? new Date(b.event.happenedAt).getTime() : 0;
        return order === 'oldest' ? aTime - bTime : bTime - aTime;
      });
  }, [items, filteredIds, order]);

  const independent = filtered.filter((item) => item.type !== 'Acontecimento' && !item.eventId);
  const upcoming = groups.filter(
    (group) => group.event.happenedAt && new Date(group.event.happenedAt).getTime() >= now,
  );
  const awaiting = groups.filter(
    (group) =>
      group.event.happenedAt &&
      new Date(group.event.happenedAt).getTime() < now &&
      !group.hasPublishedMemory,
  );
  const published = groups.filter((group) => group.hasPublishedMemory);
  const years = [
    ...new Set(
      items
        .map((item) => editorialDate(item))
        .filter((value): value is string => Boolean(value))
        .map((value) => dayKey(value).slice(0, 4)),
    ),
  ].sort().reverse();

  const days = /^\d{4}-\d{2}$/.test(month)
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()
    : 0;
  const offset = days
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).getDay()
    : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-accent text-xs font-semibold uppercase tracking-[0.14em]">Operação cotidiana</p>
          <h1 className="font-display mt-1 text-3xl font-semibold md:text-4xl">Acontecimentos</h1>
          <p className="text-muted mt-2 max-w-3xl">
            A Agenda é a origem. Depois do fato, abra a mesma ficha para acrescentar comunicação,
            mídias e memória, sem recriar o registro.
          </p>
        </div>
        {primaryCreate && (
          <Link
            href={primaryCreate.href}
            className="bg-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm"
          >
            + Registrar acontecimento
          </Link>
        )}
      </header>

      <section aria-label="Resumo dos acontecimentos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Próximos', upcoming.length, 'Agenda já cadastrada e ordenada pela data', 'border-sky-200 bg-sky-50 text-sky-950'],
          ['A complementar', awaiting.length, 'Já realizados e ainda sem memória publicada', 'border-amber-200 bg-amber-50 text-amber-950'],
          ['Memórias publicadas', published.length, 'Acontecimentos já preservados no Acervo', 'border-emerald-200 bg-emerald-50 text-emerald-950'],
          ['Independentes', independent.length, 'Registros sem vínculo com um acontecimento', 'border-slate-200 bg-slate-50 text-slate-900'],
        ].map(([label, count, detail, tone]) => (
          <div key={String(label)} className={`min-h-36 rounded-2xl border p-5 ${tone}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-2 text-4xl font-semibold">{count}</p>
            <p className="mt-2 text-xs opacity-75">{detail}</p>
          </div>
        ))}
      </section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Não foi possível carregar: {errors.join(', ')}. Os demais dados continuam disponíveis.
        </div>
      )}

      <section className="border-border bg-surface rounded-2xl border p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Visualização">
            {([
              ['painel', 'Painel'],
              ['lista', 'Lista'],
              ['calendario', 'Calendário'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
                  view === key ? 'bg-primary border-primary text-white' : 'border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="min-w-0 text-sm lg:w-80">
            <span className="font-medium">Pesquisar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Título ou conteúdo relacionado"
              className="border-border mt-1 min-h-11 w-full rounded-xl border px-3 py-2"
            />
          </label>
        </div>

        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Filtros e ordenação</summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">Tipo
              <select value={type} onChange={(event) => setType(event.target.value)} className="border-border mt-1 min-h-11 w-full rounded-xl border p-2">
                {['Todos', ...new Set(items.map((item) => item.type))].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm">Situação
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="border-border mt-1 min-h-11 w-full rounded-xl border p-2">
                {['Todos', ...new Set(items.map((item) => item.status))].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm">Ano
              <select value={year} onChange={(event) => setYear(event.target.value)} className="border-border mt-1 min-h-11 w-full rounded-xl border p-2">
                {['Todos', ...years].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm">Ordenação
              <select value={order} onChange={(event) => setOrder(event.target.value)} className="border-border mt-1 min-h-11 w-full rounded-xl border p-2">
                <option value="newest">Mais recentes primeiro</option>
                <option value="oldest">Mais antigos primeiro</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="text-accent mt-4 min-h-11 text-sm font-semibold underline"
            onClick={() => {
              setQuery('');
              setType('Todos');
              setStatus('Todos');
              setYear('Todos');
              setOrder('newest');
            }}
          >
            Limpar filtros
          </button>
        </details>
      </section>

      {view === 'painel' && (
        <section className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-muted text-xs font-semibold uppercase tracking-wide">Agenda</p>
                  <h2 className="font-display text-2xl font-semibold">Próximos acontecimentos</h2>
                </div>
                <span className="text-muted text-sm">{upcoming.length}</span>
              </div>
              <EventTileGrid groups={[...upcoming].sort((a, b) => new Date(a.event.happenedAt!).getTime() - new Date(b.event.happenedAt!).getTime())} />
            </div>
          )}

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-muted text-xs font-semibold uppercase tracking-wide">Após o evento</p>
                <h2 className="font-display text-2xl font-semibold">Continuar construção da memória</h2>
              </div>
              <span className="text-muted text-sm">{awaiting.length}</span>
            </div>
            {awaiting.length ? (
              <EventTileGrid groups={awaiting} />
            ) : (
              <p className="border-border text-muted rounded-2xl border border-dashed p-6 text-sm">Nenhum acontecimento realizado está aguardando complementos nos filtros atuais.</p>
            )}
          </div>

          {published.length > 0 && (
            <details className="border-border bg-surface rounded-2xl border p-5">
              <summary className="cursor-pointer font-semibold">Memórias publicadas · {published.length}</summary>
              <div className="mt-4"><EventTileGrid groups={published} compact /></div>
            </details>
          )}

          {independent.length > 0 && (
            <details className="border-border bg-surface rounded-2xl border p-5">
              <summary className="cursor-pointer font-semibold">Registros independentes e compatibilidade · {independent.length}</summary>
              <p className="text-muted mt-2 text-sm">Use apenas quando o conteúdo realmente não pertence a um Acontecimento.</p>
              <div className="mt-4 divide-y divide-border">
                {independent.map((item) => (
                  <Link key={item.id} href={item.href} className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm hover:underline">
                    <span><strong>{item.title}</strong><span className="text-muted ml-2">{item.type}</span></span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(item.status)}`}>{item.status}</span>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {view === 'lista' && (
        <div className="border-border bg-surface divide-y divide-border rounded-2xl border px-5">
          {groups.map((group) => <EventListRow key={group.event.id} group={group} />)}
          {groups.length === 0 && <p className="text-muted py-8 text-sm">Nenhum acontecimento encontrado.</p>}
        </div>
      )}

      {view === 'calendario' && (
        <section className="border-border bg-surface rounded-2xl border p-5">
          <label className="text-sm font-medium">Mês
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="border-border ml-3 min-h-11 rounded-xl border p-2" />
          </label>
          <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-7">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <div key={day} className="hidden text-center text-xs font-semibold md:block">{day}</div>)}
            {Array.from({ length: offset }, (_, index) => <div key={`empty-${index}`} className="hidden md:block" />)}
            {Array.from({ length: days }, (_, index) => {
              const key = `${month}-${String(index + 1).padStart(2, '0')}`;
              const dayGroups = groups.filter((group) => group.event.happenedAt && dayKey(group.event.happenedAt) === key);
              return (
                <div key={key} className="border-border min-h-24 rounded-xl border p-2">
                  <time className="text-muted text-xs" dateTime={key}>{index + 1}</time>
                  {dayGroups.map((group) => (
                    <Link key={group.event.id} href={group.event.href} className="bg-accent/10 mt-1 block rounded-lg p-2 text-xs font-semibold">{group.event.title}</Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function EventTileGrid({ groups, compact = false }: { groups: EventGroup[]; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
      {groups.map((group) => {
        const counters = new Map<string, number>();
        group.related.forEach((item) => counters.set(item.type, (counters.get(item.type) ?? 0) + 1));
        return (
          <Link
            key={group.event.id}
            href={group.event.href}
            className="border-border bg-surface hover:border-accent focus-visible:ring-accent group min-h-44 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-muted text-xs font-semibold uppercase tracking-wide">{formatDate(group.event.happenedAt)}</p>
                <h3 className="font-display mt-2 text-xl font-semibold leading-tight group-hover:underline">{group.event.title}</h3>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${group.hasPublishedMemory ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                {group.hasPublishedMemory ? 'Memória publicada' : 'Ficha aberta'}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              {counters.size ? [...counters.entries()].map(([label, count]) => (
                <span key={label} className="rounded-lg bg-slate-100 px-2.5 py-1.5">{count} {label}</span>
              )) : <span className="text-muted">Pronto para receber complementos</span>}
            </div>
            <p className="text-accent mt-5 text-sm font-semibold">Abrir Ficha Única →</p>
          </Link>
        );
      })}
    </div>
  );
}

function EventListRow({ group }: { group: EventGroup }) {
  return (
    <article className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-muted text-xs">{formatDate(group.event.happenedAt)}</p>
        <Link href={group.event.href} className="font-display text-lg font-semibold hover:underline">{group.event.title}</Link>
        <p className="text-muted mt-1 text-xs">{group.related.length} registro(s) relacionado(s) na mesma ficha</p>
      </div>
      <Link href={group.event.href} className="border-border min-h-11 shrink-0 rounded-xl border px-4 py-2.5 text-center text-sm font-semibold">Abrir ficha</Link>
    </article>
  );
}
