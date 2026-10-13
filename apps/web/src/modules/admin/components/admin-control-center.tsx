'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  Library,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from '@vl6/ui';
import { AUDIT_ACTION_LABELS } from '@/lib/audit/audit-action-label';
import { AdminToolDirectory } from './admin-tool-directory';
import { OPEN_ADMIN_SEARCH_EVENT } from './admin-command-palette';
import { PortalSurfacesPanel } from './portal-surfaces-panel';
import type { QuickAddOption } from '../lib/quick-add';
import {
  DASHBOARD_TIMEZONE,
  type DashboardOverviewData,
  type OverviewMetric,
  type OverviewModule,
  type OverviewTask,
} from '../lib/dashboard-overview-model';

const panel = 'border-border bg-surface rounded-2xl border';
const number = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat('pt-BR').format(value);
const date = (at: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: DASHBOARD_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(at));
const actionLabel = (action: string) =>
  AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS] ?? action;

const moduleIcons = {
  people: Users,
  publication: CalendarDays,
  archive: Archive,
  library: Library,
  knowledge: GraduationCap,
  operation: ShieldCheck,
};

function MetricCard({ metric }: { metric: OverviewMetric }) {
  return (
    <Link
      href={metric.href}
      className={`${panel} hover:border-accent hover:bg-accent/5 block p-4 transition-colors`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted text-xs font-medium uppercase tracking-wide">{metric.label}</p>
          <p className="font-display mt-2 text-3xl font-semibold tabular-nums">
            {number(metric.value)}
          </p>
        </div>
        <ArrowUpRight size={16} className="text-muted" />
      </div>
      <p className="text-muted mt-3 text-xs leading-relaxed">
        {metric.state === 'ready'
          ? metric.detail
          : 'Consulta indisponível; o valor não representa zero.'}
      </p>
    </Link>
  );
}

function ModuleCard({ module }: { module: OverviewModule }) {
  const Icon = moduleIcons[module.icon];
  return (
    <Link
      href={module.href}
      className={`${panel} hover:border-accent hover:bg-accent/5 block p-5 transition-colors`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-accent/10 text-accent rounded-xl p-2">
            <Icon size={19} strokeWidth={1.8} />
          </span>
          <h3 className="font-semibold">{module.title}</h3>
        </div>
        <ArrowUpRight size={15} className="text-muted" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        {module.metrics.slice(0, 4).map((metric) => (
          <div key={metric.key}>
            <p className="font-display text-xl font-semibold tabular-nums">
              {number(metric.value)}
            </p>
            <p className="text-muted mt-1 text-xs leading-relaxed">{metric.label}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

function TaskRow({ task }: { task: OverviewTask }) {
  const tone =
    task.kind === 'Alerta'
      ? 'border-red-200 bg-red-50/70 text-red-800'
      : task.kind === 'Pendência'
        ? 'border-amber-200 bg-amber-50/70 text-amber-900'
        : 'border-border bg-surface text-foreground';
  return (
    <Link
      href={task.href}
      className={`hover:border-accent flex items-start gap-3 rounded-xl border p-3 transition-colors ${tone}`}
    >
      <span className="min-w-10 rounded-lg bg-white/70 px-2 py-1.5 text-center text-sm font-semibold tabular-nums">
        {number(task.count)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">
          {task.kind}
        </span>
        <strong className="mt-0.5 block text-sm">{task.label}</strong>
        <span className="mt-1 block text-xs leading-relaxed opacity-80">{task.detail}</span>
      </span>
      <ArrowUpRight size={14} className="mt-1 shrink-0 opacity-60" />
    </Link>
  );
}

export function AdminControlCenter({
  data,
  quickAdd,
}: {
  data: DashboardOverviewData;
  quickAdd: QuickAddOption[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [periodError, setPeriodError] = useState('');
  const [auditFilter, setAuditFilter] = useState('all');

  const priorityTasks = useMemo(
    () =>
      [...data.tasks]
        .sort(
          (a, b) =>
            ['Alerta', 'Pendência', 'Dica'].indexOf(a.kind) -
            ['Alerta', 'Pendência', 'Dica'].indexOf(b.kind),
        )
        .slice(0, 8),
    [data.tasks],
  );

  const pendingTotal = data.tasks
    .filter((task) => task.kind !== 'Dica')
    .reduce((sum, task) => sum + (task.count ?? 0), 0);

  const auditItems = data.audit.items.filter(
    (item) => auditFilter === 'all' || item.action === auditFilter,
  );

  const report = (format: string) => {
    const query = new URLSearchParams({ from: data.from, to: data.to, action: auditFilter });
    return `/api/admin/dashboard/report?${query.toString()}&format=${format}`;
  };

  return (
    <div className="space-y-6">
      <header className="border-primary/15 bg-primary rounded-2xl border px-6 py-6 text-white shadow-sm sm:px-8">
        <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
          Administração VL6
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold sm:text-3xl">
          O que você quer adicionar?
        </h1>
        {quickAdd.length > 0 && (
          <nav aria-label="Adicionar" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickAdd.map((option) => (
              <Link
                key={option.key}
                href={option.href}
                className="text-primary focus-visible:ring-accent flex min-h-24 flex-col justify-center rounded-xl bg-white/95 p-4 shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2"
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Plus size={18} aria-hidden="true" />
                  {option.title}
                </span>
                <span className="mt-1 text-xs text-slate-600">{option.hint}</span>
              </Link>
            ))}
          </nav>
        )}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_ADMIN_SEARCH_EVENT))}
          className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/25 bg-white/10 px-4 text-left text-sm text-white/90 hover:bg-white/15"
        >
          <Search size={18} aria-hidden="true" />
          Procurar um Irmão, acontecimento, notícia ou tela…
        </button>
      </header>

      {data.failures.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Algumas fontes não responderam: {data.failures.join(', ')}. Os demais indicadores
          continuam válidos.
          <button type="button" onClick={() => router.refresh()} className="ml-2 underline">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section id="fila-operacional" className={`${panel} scroll-mt-6 p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">
                Fila operacional
              </p>
              <h2 className="font-display mt-1 text-xl font-semibold">O que precisa de atenção</h2>
              <p className="text-muted mt-1 text-xs">
                Pendências e alertas calculados a partir das fontes disponíveis.
              </p>
            </div>
            <span className="bg-accent/10 text-accent rounded-xl px-3 py-2 text-sm font-semibold tabular-nums">
              {number(pendingTotal)}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {priorityTasks.map((task) => (
              <TaskRow key={`${task.href}-${task.label}`} task={task} />
            ))}
            {!priorityTasks.length && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Nenhuma pendência foi identificada nas fontes disponíveis para seu acesso.
              </div>
            )}
          </div>
        </section>

        <section className={`${panel} p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">Agenda</p>
              <h2 className="font-display mt-1 text-xl font-semibold">Próximos acontecimentos</h2>
            </div>
            <Link href="/admin/publicacoes" className="text-accent text-xs underline">
              Ver agenda
            </Link>
          </div>
          <div className="divide-border mt-4 divide-y">
            {data.agenda.map((event) => (
              <Link key={event.id} href={event.href} className="block py-3 first:pt-0 last:pb-0">
                <time dateTime={event.at} className="text-accent text-xs font-medium">
                  {date(event.at)}
                </time>
                <p className="mt-1 text-sm font-semibold">{event.title}</p>
              </Link>
            ))}
            {!data.agenda.length && (
              <p className="text-muted text-sm">Nenhum próximo acontecimento retornado.</p>
            )}
          </div>
        </section>
      </div>

      <details className={`${panel} group p-5 sm:p-6`}>
        <summary className="cursor-pointer text-base font-semibold">
          Painéis, relatórios e todas as ferramentas
        </summary>
        <div className="mt-6 space-y-6">
          <PortalSurfacesPanel
            modules={data.modules}
            allowedHrefs={data.tools.map((tool) => tool.href)}
          />

          <section aria-labelledby="panorama-portal">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="panorama-portal" className="font-display text-xl font-semibold">
                  Panorama do Portal
                </h2>
                <p className="text-muted mt-1 text-xs">
                  Indicadores atuais por área administrativa.
                </p>
              </div>
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!from || !to || from > to) {
                    setPeriodError('Informe um intervalo válido.');
                    return;
                  }
                  setPeriodError('');
                  router.push(`/admin?${new URLSearchParams({ from, to })}`);
                }}
              >
                <label className="text-xs">
                  De
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="border-border bg-surface mt-1 block rounded-lg border p-2"
                  />
                </label>
                <label className="text-xs">
                  Até
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="border-border bg-surface mt-1 block rounded-lg border p-2"
                  />
                </label>
                <button className="border-border bg-surface rounded-lg border px-3 py-2 text-sm">
                  Aplicar
                </button>
              </form>
            </div>
            {periodError && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {periodError}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.priority.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </section>

          <section aria-labelledby="modulos-operacionais">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 id="modulos-operacionais" className="font-display text-xl font-semibold">
                  Áreas sob acompanhamento
                </h2>
                <p className="text-muted mt-1 text-xs">
                  Abra uma área para aprofundar cadastro, conteúdo e integridade.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.modules.map((module) => (
                <ModuleCard key={module.title} module={module} />
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <section className={`${panel} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-accent text-xs font-semibold uppercase tracking-widest">
                    Rastreabilidade
                  </p>
                  <h2 className="font-display mt-1 text-xl font-semibold">
                    Atividade administrativa
                  </h2>
                  <p className="text-muted mt-1 text-xs">
                    Quem fez, o que mudou e quando, dentro da cobertura de auditoria disponível.
                  </p>
                </div>
                <select
                  value={auditFilter}
                  onChange={(event) => setAuditFilter(event.target.value)}
                  className="border-border bg-surface rounded-lg border p-2 text-sm"
                >
                  <option value="all">Todas as ações</option>
                  {data.audit.counts.map((item) => (
                    <option key={item.action} value={item.action}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              {data.audit.state === 'ready' ? (
                <>
                  {!data.audit.complete && (
                    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                      Amostra parcial: o limite da consulta foi atingido. Reduza o período para
                      conferência completa.
                    </p>
                  )}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-border text-muted border-b">
                          <th className="p-2">Data</th>
                          <th className="p-2">Ação</th>
                          <th className="p-2">Responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditItems.slice(0, 10).map((item) => (
                          <tr key={item.id} className="border-border border-b last:border-0">
                            <td className="whitespace-nowrap p-2 text-xs">{date(item.at)}</td>
                            <td className="p-2">
                              <span className="font-medium">{actionLabel(item.action)}</span>
                              <small className="text-muted block">
                                {item.entity} · {item.entityId}
                              </small>
                            </td>
                            <td className="p-2 text-xs">{item.actor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!auditItems.length && (
                      <p className="text-muted py-4 text-sm">
                        Nenhum evento retornado para este filtro.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted mt-4 text-sm">
                  {data.audit.state === 'forbidden'
                    ? 'Auditoria restrita para este perfil.'
                    : 'Consulta de auditoria indisponível.'}
                </p>
              )}
            </section>

            <section className={`${panel} p-5 sm:p-6`}>
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">
                Prestação de contas
              </p>
              <h2 className="font-display mt-1 text-xl font-semibold">
                Relatórios administrativos
              </h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Exporte o panorama atual, as pendências e a movimentação autorizada do período
                selecionado.
              </p>
              <div className="mt-5 grid gap-2">
                <a
                  href={report('pdf')}
                  className="bg-primary rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Emitir relatório PDF
                </a>
                <a
                  href={report('csv')}
                  className="border-border rounded-xl border px-4 py-3 text-center text-sm font-medium"
                >
                  Exportar CSV
                </a>
              </div>
              <div className="border-border mt-5 border-t pt-4">
                <p className="text-muted text-xs leading-relaxed">
                  Período: {data.from} a {data.to}. A auditoria registra apenas operações cobertas
                  pelas fontes e permissões existentes; ela não reconstrói estados anteriores do
                  cadastro.
                </p>
              </div>
            </section>
          </div>

          <section className={`${panel} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-widest">
                  Administração avançada
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold">Ferramentas específicas</h2>
                <p className="text-muted mt-1 text-xs">
                  Use apenas quando precisar de manutenção, revisão detalhada ou operação
                  especializada.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/admin/conhecimento"
                  className="border-border rounded-lg border px-3 py-2 text-xs"
                >
                  <GraduationCap size={14} className="mr-1 inline" />
                  Conhecimento
                </Link>
                <Link
                  href="/admin/configuracoes"
                  className="border-border rounded-lg border px-3 py-2 text-xs"
                >
                  <Settings size={14} className="mr-1 inline" />
                  Configurações
                </Link>
              </div>
            </div>
            <div className="mt-5">
              <AdminToolDirectory tools={data.tools} />
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
