'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Library,
  Settings,
  ShieldCheck,
  Users,
} from '@vl6/ui';
import { AUDIT_ACTION_LABELS } from '@/lib/audit/audit-action-label';
import { AdminToolDirectory } from './admin-tool-directory';
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
      className={`${panel} block p-4 transition-colors hover:border-accent hover:bg-accent/5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted text-xs font-medium uppercase tracking-wide">{metric.label}</p>
          <p className="font-display mt-2 text-3xl font-semibold tabular-nums">{number(metric.value)}</p>
        </div>
        <ArrowUpRight size={16} className="text-muted" />
      </div>
      <p className="text-muted mt-3 text-xs leading-relaxed">
        {metric.state === 'ready' ? metric.detail : 'Consulta indisponível; o valor não representa zero.'}
      </p>
    </Link>
  );
}

function ModuleCard({ module }: { module: OverviewModule }) {
  const Icon = moduleIcons[module.icon];
  return (
    <Link
      href={module.href}
      className={`${panel} block p-5 transition-colors hover:border-accent hover:bg-accent/5`}
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
            <p className="font-display text-xl font-semibold tabular-nums">{number(metric.value)}</p>
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
      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors hover:border-accent ${tone}`}
    >
      <span className="min-w-10 rounded-lg bg-white/70 px-2 py-1.5 text-center text-sm font-semibold tabular-nums">
        {number(task.count)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">{task.kind}</span>
        <strong className="mt-0.5 block text-sm">{task.label}</strong>
        <span className="mt-1 block text-xs leading-relaxed opacity-80">{task.detail}</span>
      </span>
      <ArrowUpRight size={14} className="mt-1 shrink-0 opacity-60" />
    </Link>
  );
}

export function AdminControlCenter({ data }: { data: DashboardOverviewData }) {
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

  const quickActions = [
    {
      href: '/admin/publicacoes/novo',
      title: 'Registrar acontecimento',
      detail: 'Crie o fato central uma vez e siga para notícia, aviso, mídia e Acervo.',
      icon: CalendarDays,
      primary: true,
    },
    {
      href: '/admin/publicacoes',
      title: 'Central de Publicação',
      detail: 'Acompanhe o ciclo completo dos acontecimentos já registrados.',
      icon: ShieldCheck,
      primary: false,
    },
    {
      href: '/admin/acervo',
      title: 'Memória e Acervo',
      detail: 'Revise documentos, álbuns, relações, coleções e catalogação.',
      icon: Archive,
      primary: false,
    },
    {
      href: '/admin/pessoas',
      title: 'Pessoas e Loja',
      detail: 'Irmãos, acessos, gestões, paramaçônicas e dados institucionais.',
      icon: Users,
      primary: false,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-primary/15 bg-primary text-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.45fr_1fr] lg:px-8 lg:py-8">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <LayoutDashboard size={18} />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Central de Controle</p>
            </div>
            <h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
              Administração VL6
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
              Um único lugar para registrar, acompanhar, corrigir e auditar o que acontece no Portal.
              O trabalho começa no acontecimento e segue pelos conteúdos relacionados até a memória da Loja.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/admin/publicacoes/novo"
                className="bg-accent text-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                + Registrar acontecimento
              </Link>
              <a
                href="#fila-operacional"
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white"
              >
                Ver pendências
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/65">Pendências prioritárias</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums">{number(pendingTotal)}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/65">Próximos acontecimentos</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums">
                {number(data.modules.find((m) => m.icon === 'publication')?.metrics.find((m) => m.key === 'upcoming')?.value ?? 0)}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs text-white/65">Atualização da visão</p>
              <p className="mt-1 text-sm font-medium">{date(data.updatedAt)}</p>
            </div>
          </div>
        </div>
      </header>

      {data.failures.length > 0 && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Algumas fontes não responderam: {data.failures.join(', ')}. Os demais indicadores continuam válidos.
          <button type="button" onClick={() => router.refresh()} className="ml-2 underline">
            Tentar novamente
          </button>
        </div>
      )}

      <section aria-labelledby="acoes-principais">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="acoes-principais" className="font-display text-xl font-semibold">Ações principais</h2>
            <p className="text-muted mt-1 text-xs">Fluxos frequentes, sem procurar várias telas.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`${panel} block p-4 transition-colors ${
                  action.primary ? 'border-accent bg-accent/10' : 'hover:border-accent hover:bg-accent/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-primary/5 text-primary rounded-xl p-2"><Icon size={19} /></span>
                  <ArrowUpRight size={15} className="text-muted" />
                </div>
                <h3 className="mt-4 font-semibold">{action.title}</h3>
                <p className="text-muted mt-2 text-xs leading-relaxed">{action.detail}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={`${panel} p-5 sm:p-6`} aria-labelledby="fluxo-central">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest">Modelo operacional</p>
            <h2 id="fluxo-central" className="font-display mt-1 text-xl font-semibold">Um fato, uma cadeia de memória</h2>
            <p className="text-muted mt-2 max-w-3xl text-sm leading-relaxed">
              Data, local, gestão e contexto pertencem ao acontecimento central. Notícias, avisos, fotos, vídeos e documentos são dependentes dele e devem reaproveitar esses dados.
            </p>
          </div>
          <Link href="/admin/publicacoes" className="text-accent text-sm font-medium underline">Abrir ciclo editorial</Link>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {['Acontecimento', 'Comunicação', 'Mídias', 'Acervo', 'Memória'].map((label, index) => (
            <div key={label} className="border-border rounded-xl border p-3">
              <span className="bg-accent text-primary inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">{index + 1}</span>
              <p className="mt-3 text-sm font-semibold">{label}</p>
              <p className="text-muted mt-1 text-xs">
                {[
                  'Fato, data, local e gestão',
                  'Notícia, aviso e divulgação',
                  'Fotos, vídeos e documentos',
                  'Catálogo, relações e coleções',
                  'Linha do tempo e Constelação',
                ][index]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section id="fila-operacional" className={`${panel} scroll-mt-6 p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">Fila operacional</p>
              <h2 className="font-display mt-1 text-xl font-semibold">O que precisa de atenção</h2>
              <p className="text-muted mt-1 text-xs">Pendências e alertas calculados a partir das fontes disponíveis.</p>
            </div>
            <span className="bg-accent/10 text-accent rounded-xl px-3 py-2 text-sm font-semibold tabular-nums">{number(pendingTotal)}</span>
          </div>
          <div className="mt-4 space-y-2">
            {priorityTasks.map((task) => <TaskRow key={`${task.href}-${task.label}`} task={task} />)}
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
            <Link href="/admin/publicacoes" className="text-accent text-xs underline">Ver agenda</Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {data.agenda.map((event) => (
              <Link key={event.id} href={event.href} className="block py-3 first:pt-0 last:pb-0">
                <time dateTime={event.at} className="text-accent text-xs font-medium">{date(event.at)}</time>
                <p className="mt-1 text-sm font-semibold">{event.title}</p>
              </Link>
            ))}
            {!data.agenda.length && <p className="text-muted text-sm">Nenhum próximo acontecimento retornado.</p>}
          </div>
        </section>
      </div>

      <section aria-labelledby="panorama-portal">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="panorama-portal" className="font-display text-xl font-semibold">Panorama do Portal</h2>
            <p className="text-muted mt-1 text-xs">Indicadores atuais por área administrativa.</p>
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
            <label className="text-xs">De<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-border bg-surface mt-1 block rounded-lg border p-2" /></label>
            <label className="text-xs">Até<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-border bg-surface mt-1 block rounded-lg border p-2" /></label>
            <button className="border-border bg-surface rounded-lg border px-3 py-2 text-sm">Aplicar</button>
          </form>
        </div>
        {periodError && <p role="alert" className="mb-3 text-sm text-red-700">{periodError}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.priority.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
        </div>
      </section>

      <section aria-labelledby="modulos-operacionais">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="modulos-operacionais" className="font-display text-xl font-semibold">Áreas sob acompanhamento</h2>
            <p className="text-muted mt-1 text-xs">Abra uma área para aprofundar cadastro, conteúdo e integridade.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.modules.map((module) => <ModuleCard key={module.title} module={module} />)}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className={`${panel} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">Rastreabilidade</p>
              <h2 className="font-display mt-1 text-xl font-semibold">Atividade administrativa</h2>
              <p className="text-muted mt-1 text-xs">Quem fez, o que mudou e quando, dentro da cobertura de auditoria disponível.</p>
            </div>
            <select
              value={auditFilter}
              onChange={(event) => setAuditFilter(event.target.value)}
              className="border-border bg-surface rounded-lg border p-2 text-sm"
            >
              <option value="all">Todas as ações</option>
              {data.audit.counts.map((item) => (
                <option key={item.action} value={item.action}>{item.label}</option>
              ))}
            </select>
          </div>
          {data.audit.state === 'ready' ? (
            <>
              {!data.audit.complete && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Amostra parcial: o limite da consulta foi atingido. Reduza o período para conferência completa.</p>
              )}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-border border-b text-muted"><th className="p-2">Data</th><th className="p-2">Ação</th><th className="p-2">Responsável</th></tr></thead>
                  <tbody>
                    {auditItems.slice(0, 10).map((item) => (
                      <tr key={item.id} className="border-border border-b last:border-0">
                        <td className="whitespace-nowrap p-2 text-xs">{date(item.at)}</td>
                        <td className="p-2"><span className="font-medium">{actionLabel(item.action)}</span><small className="text-muted block">{item.entity} · {item.entityId}</small></td>
                        <td className="p-2 text-xs">{item.actor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!auditItems.length && <p className="text-muted py-4 text-sm">Nenhum evento retornado para este filtro.</p>}
              </div>
            </>
          ) : (
            <p className="text-muted mt-4 text-sm">{data.audit.state === 'forbidden' ? 'Auditoria restrita para este perfil.' : 'Consulta de auditoria indisponível.'}</p>
          )}
        </section>

        <section className={`${panel} p-5 sm:p-6`}>
          <p className="text-accent text-xs font-semibold uppercase tracking-widest">Prestação de contas</p>
          <h2 className="font-display mt-1 text-xl font-semibold">Relatórios administrativos</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Exporte o panorama atual, as pendências e a movimentação autorizada do período selecionado.
          </p>
          <div className="mt-5 grid gap-2">
            <a href={report('pdf')} className="bg-primary text-white rounded-xl px-4 py-3 text-center text-sm font-semibold">Emitir relatório PDF</a>
            <a href={report('csv')} className="border-border rounded-xl border px-4 py-3 text-center text-sm font-medium">Exportar CSV</a>
          </div>
          <div className="border-border mt-5 border-t pt-4">
            <p className="text-muted text-xs leading-relaxed">
              Período: {data.from} a {data.to}. A auditoria registra apenas operações cobertas pelas fontes e permissões existentes; ela não reconstrói estados anteriores do cadastro.
            </p>
          </div>
        </section>
      </div>

      <section className={`${panel} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest">Administração avançada</p>
            <h2 className="font-display mt-1 text-xl font-semibold">Ferramentas específicas</h2>
            <p className="text-muted mt-1 text-xs">Use apenas quando precisar de manutenção, revisão detalhada ou operação especializada.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/conhecimento" className="border-border rounded-lg border px-3 py-2 text-xs"><GraduationCap size={14} className="mr-1 inline" />Conhecimento</Link>
            <Link href="/admin/configuracoes" className="border-border rounded-lg border px-3 py-2 text-xs"><Settings size={14} className="mr-1 inline" />Configurações</Link>
          </div>
        </div>
        <div className="mt-5"><AdminToolDirectory tools={data.tools} /></div>
      </section>
    </div>
  );
}
