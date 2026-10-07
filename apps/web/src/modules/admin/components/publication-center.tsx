'use client';

import { useState } from 'react';
import Link from 'next/link';
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
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(value))
    : '—';
const dayKey = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

export function PublicationCenter({
  items,
  createLinks,
  errors,
}: {
  items: EditorialItem[];
  createLinks: EditorialLink[];
  errors: string[];
}) {
  const completeLink = createLinks.find((link) => link.href === '/admin/publicacoes/novo');
  const otherLinks = createLinks.filter((link) => link !== completeLink);
  const [view, setView] = useState('lista');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [year, setYear] = useState('Todos');
  const [order, setOrder] = useState('newest');
  const [month, setMonth] = useState(() => dayKey(new Date().toISOString()).slice(0, 7));
  const [dateKind, setDateKind] = useState<'happenedAt' | 'publishedAt' | 'scheduledAt'>(
    'happenedAt',
  );
  const years = [...new Set(items.map((i) => editorialDate(i)).filter((d): d is string => Boolean(d)).map((d) => dayKey(d).slice(0, 4)))].sort().reverse();
  const filtered = filterEditorialItems(items, { query, type, status, year, order });
  const days = /^\d{4}-\d{2}$/.test(month)
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()
    : 0;
  const offset = days
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).getDay()
    : 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Publicações e Agenda</h1>
          <p className="text-muted mt-2">
            Abra um acontecimento para editar sua notícia, preparar avisos e organizar os arquivos
            no mesmo espaço.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {completeLink && (
            <Link
              href={completeLink.href}
              className="bg-primary rounded-xl px-4 py-3 text-sm font-semibold text-white"
            >
              Nova publicação
            </Link>
          )}
          {otherLinks.length > 0 && (
            <details className="border-border bg-surface rounded-xl border p-3">
              <summary className="cursor-pointer font-semibold">
                {completeLink ? 'Outros conteúdos' : 'Criar'}
              </summary>
              <nav aria-label="Criar conteúdo" className="mt-3 flex flex-col gap-1">
                {otherLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="hover:bg-accent/10 rounded-lg px-3 py-2 text-sm"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </details>
          )}
        </div>
      </div>
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Não foi possível carregar: {errors.join(', ')}. Os demais resultados continuam
          disponíveis.{' '}
          <Link href="/admin/publicacoes" className="underline">
            Tentar novamente
          </Link>
        </div>
      )}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Visualização">
          {['lista', 'calendario'].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-lg border px-4 py-2 text-sm ${view === v ? 'bg-primary text-white' : 'border-border'}`}
            >
              {v === 'lista' ? 'Lista' : 'Calendário editorial'}
            </button>
          ))}
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            Pesquisar título
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-border mt-1 w-full rounded-lg border p-2"
            />
          </label>
          <label className="text-sm">
            Tipo
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border-border mt-1 w-full rounded-lg border p-2"
            >
              {['Todos', ...new Set(items.map((i) => i.type))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Situação
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border-border mt-1 w-full rounded-lg border p-2"
            >
              {['Todos', ...new Set(items.map((i) => i.status))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ano
            <select value={year} onChange={(e) => setYear(e.target.value)} className="border-border mt-1 w-full rounded-lg border p-2">
              {['Todos', ...years].map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Ordenação
            <select value={order} onChange={(e) => setOrder(e.target.value)} className="border-border mt-1 w-full rounded-lg border p-2">
              <option value="newest">Mais novas primeiro</option>
              <option value="oldest">Mais antigas primeiro</option>
            </select>
          </label>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted text-sm" role="status">{filtered.length} de {items.length} registros</p>
          <button type="button" className="text-accent text-sm underline" onClick={() => { setQuery(''); setType('Todos'); setStatus('Todos'); setYear('Todos'); setOrder('newest'); }}>
            Limpar filtros
          </button>
        </div>
        <p className="text-muted mb-4 text-xs">
          Ordenação e ano usam a data de publicação; quando ausente, a do acontecimento, planejamento ou cadastro.
        </p>
        {view === 'lista' ? (
          <div className="divide-border divide-y">
            {filtered.map((i) => (
              <article key={i.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-muted text-xs">
                    {i.type} · {i.destination}
                  </p>
                  <Link
                    href={i.href}
                    className="font-display text-lg font-semibold hover:underline"
                  >
                    {i.title}
                  </Link>
                  <p className="text-muted mt-1 text-xs">
                    Acontecimento: {date(i.happenedAt)} · Publicação: {date(i.publishedAt)} ·
                    Planejamento: {date(i.scheduledAt)}
                    {!i.publishedAt && !i.happenedAt && !i.scheduledAt && i.createdAt ? ` · Cadastro: ${date(i.createdAt)}` : ''}
                    {i.expiresAt ? ` · Exibição até: ${date(i.expiresAt)}` : ''}
                  </p>
                  {i.eventId && (
                    <Link
                      href={`/admin/publicacoes/${encodeURIComponent(i.eventId)}`}
                      className="text-accent mt-2 inline-block text-xs underline"
                    >
                      Editar tudo neste acontecimento
                    </Link>
                  )}
                </div>
                <span className="bg-accent/10 rounded-lg px-3 py-1 text-xs font-medium">
                  {i.status}
                </span>
              </article>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted py-6">Nenhum conteúdo encontrado para estes filtros.</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="text-sm">
                Mês
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="border-border ml-2 rounded-lg border p-2"
                />
              </label>
              <label className="text-sm">
                Data
                <select
                  value={dateKind}
                  onChange={(e) => setDateKind(e.target.value as typeof dateKind)}
                  className="border-border ml-2 rounded-lg border p-2"
                >
                  <option value="happenedAt">Acontecimento</option>
                  <option value="publishedAt">Publicação realizada</option>
                  <option value="scheduledAt">Planejamento editorial</option>
                </select>
              </label>
            </div>
            <p className="text-muted mb-4 text-sm">
              A data do acontecimento não representa agendamento de publicação. O planejamento de
              artes não confirma envio externo.
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="hidden text-center text-xs font-semibold md:block">
                  {d}
                </div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div key={`empty-${i}`} className="hidden md:block" />
              ))}
              {Array.from({ length: days }, (_, n) => {
                const key = `${month}-${String(n + 1).padStart(2, '0')}`;
                const entries = filtered.filter((i) => i[dateKind] && dayKey(i[dateKind]!) === key);
                return (
                  <div key={key} className="border-border min-h-20 rounded-lg border p-2">
                    <time className="text-muted text-xs" dateTime={key}>
                      {n + 1}
                    </time>
                    {entries.map((i) => (
                      <Link
                        key={i.id}
                        href={i.href}
                        className="bg-accent/10 mt-1 block rounded p-2 text-xs"
                      >
                        <strong>{i.title}</strong>
                        <span className="mt-1 block">
                          {i.type} · {i.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <p className="text-muted text-sm">
        Os conteúdos vinculados abrem no espaço único do acontecimento. Notícias e avisos avulsos
        continuam disponíveis, com suas funções de edição e publicação.
      </p>
    </div>
  );
}
