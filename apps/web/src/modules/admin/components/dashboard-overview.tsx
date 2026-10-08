"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  Library,
  Users,
  ShieldCheck,
} from "@vl6/ui";
import { AdminToolDirectory } from "./admin-tool-directory";
import { AUDIT_ACTION_LABELS } from "@/lib/audit/audit-action-label";
import {
  DASHBOARD_TIMEZONE,
  type DashboardOverviewData,
  type OverviewMetric,
} from "../lib/dashboard-overview-model";

const icons = {
  people: Users,
  publication: CalendarDays,
  archive: Archive,
  library: Library,
  knowledge: Library,
  operation: ShieldCheck,
};
const number = (value: number | null) =>
  value === null ? "—" : new Intl.NumberFormat("pt-BR").format(value);
const date = (at: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: DASHBOARD_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(at));
const actionLabel = (action: string) =>
  AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS] ?? action;
const panel = "border-border bg-surface rounded-2xl border p-5 sm:p-6";
function Value({ metric }: { metric: OverviewMetric }) {
  return (
    <div>
      <span className="font-display block text-2xl font-semibold tabular-nums">
        {number(metric.value)}
      </span>
      <span className="text-muted text-xs">{metric.label}</span>
      {metric.state !== "ready" && (
        <span className="mt-1 block text-xs text-amber-700">
          {metric.state === "unsupported"
            ? "Relatório específico / fonte não consolidada"
            : "Consulta indisponível"}
        </span>
      )}
    </div>
  );
}
function Bar({
  label,
  value,
  total,
  href,
  onClick,
}: {
  label: string;
  value: number;
  total: number;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{number(value)}</span>
      </span>
      <span className="bg-accent/10 mt-2 block h-2 overflow-hidden rounded-full">
        <span
          className="bg-accent block h-full"
          style={{
            width: `${total ? Math.min(100, (value / total) * 100) : 0}%`,
          }}
        />
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg py-2 hover:underline">
      {content}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg py-2 text-left hover:bg-accent/5"
    >
      {content}
    </button>
  );
}
export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const router = useRouter(),
    [from, setFrom] = useState(data.from),
    [to, setTo] = useState(data.to),
    [error, setError] = useState(""),
    [selectedModule, setSelectedModule] = useState<string | null>(null),
    [action, setAction] = useState("all"),
    [page, setPage] = useState(0),
    [dismissed, setDismissed] = useState<string[]>([]);
  const tasks = data.tasks.filter((t) => !dismissed.includes(t.href + t.label));
  const sortedTasks = [...tasks].sort(
    (a, b) =>
      ["Alerta", "Pendência", "Dica"].indexOf(a.kind) -
      ["Alerta", "Pendência", "Dica"].indexOf(b.kind),
  );
  const selected = data.modules.find((m) => m.title === selectedModule);
  const history = data.audit.items.filter(
    (a) => action === "all" || a.action === action,
  );
  const query = new URLSearchParams({ from: data.from, to: data.to, action });
  const report = (format: string) =>
    `/api/admin/dashboard/report?${query.toString()}&format=${format}`;
  const goReport = () => {
    const el = document.getElementById(
      "dashboard-reports",
    ) as HTMLDetailsElement | null;
    if (el) {
      el.open = true;
      el.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <div className="space-y-6">
      <header className="bg-primary text-white flex flex-wrap items-center justify-between gap-6 rounded-2xl border-t-4 border-accent p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest opacity-80">
            {data.tenantName}
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">
            Uma visão completa do Portal
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-90">
            Pessoas, conhecimento e memória da Loja. Veja o que temos, o que
            aconteceu e o que precisa de atenção.
          </p>
        </div>
        <button
          type="button"
          onClick={goReport}
          className="bg-surface text-foreground flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Emitir relatório <ArrowUpRight size={16} />
        </button>
      </header>
      {data.failures.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Consultas indisponíveis: {data.failures.join(", ")}. Os demais
          indicadores continuam disponíveis.{" "}
          <button
            onClick={() => router.refresh()}
            type="button"
            className="underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
      <form
        className="flex flex-wrap items-end justify-between gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!from || !to || from > to) {
            setError("Informe um intervalo válido.");
            return;
          }
          setError("");
          router.push(`/admin?${new URLSearchParams({ from, to })}`);
        }}
      >
        <div>
          <h2 className="font-display text-xl font-semibold">
            Panorama institucional
          </h2>
          <p className="text-muted mt-1 text-xs">
            Situação atual · atualizado em {date(data.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            Movimentação de
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-border bg-surface mt-1 block rounded-lg border p-2"
              required
            />
          </label>
          <label className="text-xs">
            Até
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-border bg-surface mt-1 block rounded-lg border p-2"
              required
            />
          </label>
          <button className="border-border bg-surface rounded-lg border px-3 py-2 text-sm">
            Aplicar
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.priority.map((m) => (
          <Link
            key={m.key}
            href={m.href}
            className={`${panel} hover:border-accent`}
          >
            <p className="text-muted text-sm">{m.label}</p>
            <p className="font-display my-3 text-3xl font-semibold tabular-nums">
              {number(m.value)}
            </p>
            <p className="text-muted text-xs leading-relaxed">
              {m.state === "ready"
                ? m.detail
                : "Consulta indisponível; não representa zero."}
            </p>
          </Link>
        ))}
      </div>
      <section aria-labelledby="dashboard-modules">
        <div className="mb-4 flex flex-wrap justify-between gap-2">
          <h2
            id="dashboard-modules"
            className="font-display text-xl font-semibold"
          >
            O que temos no Portal
          </h2>
          <span className="text-muted text-xs">
            Totais atuais · selecione para aprofundar
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.modules.map((m) => {
            const Icon = icons[m.icon];
            return (
              <button
                type="button"
                key={m.title}
                aria-expanded={selectedModule === m.title}
                aria-controls="dashboard-module-detail"
                onClick={() =>
                  setSelectedModule(selectedModule === m.title ? null : m.title)
                }
                className={`${panel} text-left transition-colors hover:border-accent`}
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="bg-accent/10 text-accent rounded-xl p-2">
                    <Icon size={20} />
                  </span>
                  <h3 className="font-semibold">{m.title}</h3>
                </div>
                <div className="flex flex-wrap gap-6">
                  {m.metrics.slice(0, 2).map((v) => (
                    <Value key={v.key} metric={v} />
                  ))}
                </div>
                <div className="border-border text-muted mt-5 flex items-center justify-between border-t pt-3 text-xs">
                  <span>Composição, fontes e relatórios</span>
                  <ArrowUpRight size={14} />
                </div>
              </button>
            );
          })}
        </div>
        <div
          id="dashboard-module-detail"
          hidden={!selected}
          className={`${panel} mt-3`}
        >
          {selected && (
            <>
              <h3 className="font-display text-lg font-semibold">
                {selected.title}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {selected.metrics.map((v) => (
                  <div key={v.key}>
                    <Value metric={v} />
                    <p className="text-muted my-2 text-xs leading-relaxed">
                      {v.detail}
                    </p>
                    <Link
                      href={v.href}
                      className="text-accent text-xs underline"
                    >
                      Consultar registros
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="font-display text-lg font-semibold">
            Cadastro e situação institucional
          </h2>
          {data.coverage ? (
            <>
              <p className="text-muted my-3 text-xs">
                Base comum: {data.coverage.active} Irmãos ativos. Conta ativa e
                vínculo recíproco verificados.
              </p>
              <Bar
                label="Ativos com acesso válido"
                value={data.coverage.linked}
                total={data.coverage.active}
                href="/admin/pessoas/irmaos?situacao=ativo"
              />
              <Bar
                label="Sem acesso válido"
                value={data.coverage.unlinked}
                total={data.coverage.active}
                href="/admin/pessoas/irmaos?situacao=ativo"
              />
            </>
          ) : (
            <p className="text-muted my-3 text-sm">
              Cobertura exige leitura autorizada e consulta válida de membros e
              contas.
            </p>
          )}
          {data.situations.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm">
                Distribuição por situação maçônica
              </summary>
              <div className="mt-3">
                {data.situations.map((s) => (
                  <Bar
                    key={s.label}
                    {...s}
                    total={data.situations.reduce((n, s) => n + s.value, 0)}
                  />
                ))}
              </div>
            </details>
          )}
        </section>
        <section id="plano-de-acao" className={`${panel} scroll-mt-6`}>
          <h2 className="font-display text-lg font-semibold">
            Dicas e próximos passos
          </h2>
          <p className="text-muted mt-2 text-xs">
            Filas independentes · quantidades não são somadas.
          </p>
          {sortedTasks.length ? (
            sortedTasks.map((t) => (
              <div
                key={t.href + t.label}
                className="border-border flex flex-wrap items-start gap-3 border-b py-4 last:border-0"
              >
                <span className="bg-accent/10 text-accent rounded-lg px-3 py-2 tabular-nums">
                  {number(t.count)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-muted text-xs">{t.kind}</p>
                  <h3 className="mt-1 text-sm font-medium">{t.label}</h3>
                  <p className="text-muted mt-1 text-xs leading-relaxed">
                    {t.detail}
                  </p>
                  <Link
                    href={t.href}
                    className="text-accent mt-2 inline-block text-xs underline"
                  >
                    Conferir →
                  </Link>
                  {t.kind === "Dica" && (
                    <button
                      type="button"
                      onClick={() =>
                        setDismissed([...dismissed, t.href + t.label])
                      }
                      className="text-muted ml-4 text-xs underline"
                    >
                      Agora não
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted mt-4 text-sm">
              Nenhuma pendência identificada nas fontes disponíveis para seu
              acesso. Confira eventuais falhas de consulta acima.
            </p>
          )}
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="font-display text-lg font-semibold">
            Movimentação no período
          </h2>
          <p className="text-muted my-3 text-xs">
            {data.from} a {data.to} · {DASHBOARD_TIMEZONE}
          </p>
          {data.audit.state === "ready" ? (
            <>
              {!data.audit.complete && (
                <p className="mb-3 text-sm text-amber-700">
                  Amostra parcial: limite de 2.000 eventos atingido. Reduza o
                  período para conferir a composição completa.
                </p>
              )}
              {data.audit.counts.map((v) => (
                <Bar
                  key={v.action}
                  label={v.label}
                  value={v.value}
                  total={Math.max(...data.audit.counts.map((x) => x.value), 1)}
                  onClick={() => {
                    setAction(v.action);
                    setPage(0);
                    goReport();
                  }}
                />
              ))}
              <p className="text-muted mt-3 text-xs">
                Eventos administrativos de entidades conhecidas; não são
                acessos, engajamento ou registros únicos. Operações não
                auditadas não podem ser reconstruídas.
              </p>
            </>
          ) : (
            <p className="text-muted text-sm">
              {data.audit.state === "forbidden"
                ? "Auditoria restrita pela permissão."
                : "Consulta de auditoria indisponível."}
            </p>
          )}
        </section>
        <section className={panel}>
          <h2 className="font-display text-lg font-semibold">
            Agenda e continuidade
          </h2>
          <p className="text-muted my-3 text-xs">
            Próximos acontecimentos registrados
          </p>
          {data.agenda.map((e) => (
            <Link
              key={e.id}
              href={e.href}
              className="border-border block border-b py-3 last:border-0"
            >
              <time dateTime={e.at} className="text-accent text-xs">
                {date(e.at)}
              </time>
              <h3 className="mt-1 text-sm font-medium">{e.title}</h3>
            </Link>
          ))}
          {!data.agenda.length && (
            <p className="text-muted text-sm">
              Nenhum próximo acontecimento retornado nas fontes disponíveis para
              seu acesso.
            </p>
          )}
          <p className="text-muted mt-4 text-xs">
            Notícias, avisos e arquivos continuam no espaço unificado de
            Publicações e Agenda.
          </p>
        </section>
      </div>
      {data.audit.state === "ready" && (
        <section className={panel}>
          <h2 className="font-display text-lg font-semibold">
            O que mudou recentemente
          </h2>
          <p className="text-muted mt-2 text-xs">
            Últimos eventos do período · mais recentes primeiro
          </p>
          <ul className="divide-border mt-4 divide-y">
            {data.audit.items.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm">
                    {actionLabel(a.action)} · {a.entity}
                  </p>
                  <p className="text-muted mt-1 text-xs">{a.actor}</p>
                </div>
                <time dateTime={a.at} className="text-muted text-xs">
                  {date(a.at)}
                </time>
              </li>
            ))}
          </ul>
          {!data.audit.items.length && (
            <p className="text-muted mt-4 text-sm">
              Nenhum evento de entidade conhecida retornado neste período.
            </p>
          )}
        </section>
      )}
      <details id="dashboard-reports" className={`${panel} scroll-mt-6`}>
        <summary className="font-display text-lg font-semibold">
          Relatórios e prestação de contas
        </summary>
        <p className="text-muted my-4 text-sm">
          O relatório inclui panorama atual, pendências atuais e histórico do
          período autorizado. Não reconstrói a situação passada do cadastro.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Ação do histórico
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              className="border-border bg-surface mt-1 block rounded-lg border p-2"
            >
              <option value="all">Todas as ações</option>
              {data.audit.counts.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <a
            href={report("csv")}
            className="border-border rounded-lg border px-4 py-2 text-sm"
          >
            Exportar CSV
          </a>
          <a
            href={report("pdf")}
            className="bg-primary text-white rounded-lg px-4 py-2 text-sm"
          >
            Emitir PDF
          </a>
        </div>
        {data.audit.state === "ready" && (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-border text-muted border-b">
                    <th className="p-2">Data</th>
                    <th className="p-2">Ação / entidade</th>
                    <th className="p-2">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(page * 20, (page + 1) * 20).map((a) => (
                    <tr key={a.id} className="border-border border-b">
                      <td className="p-2">{date(a.at)}</td>
                      <td className="p-2">
                        {actionLabel(a.action)} · {a.entity}
                        <small className="text-muted block">
                          Registro: {a.entityId}
                        </small>
                      </td>
                      <td className="p-2">{a.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded border px-3 py-2 disabled:opacity-40"
              >
                Anterior
              </button>
              <span role="status">
                Página {page + 1} · {history.length} eventos{" "}
                {data.audit.complete ? "retornados" : "na amostra parcial"}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 20 >= history.length}
                onClick={() => setPage(page + 1)}
                className="rounded border px-3 py-2 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </details>
      <details className={panel}>
        <summary className="font-display text-lg font-semibold">
          Ferramentas, relatórios existentes e fontes
        </summary>
        <div className="mt-4">
          <AdminToolDirectory tools={data.tools} />
        </div>
        <p className="text-muted mt-4 text-xs leading-relaxed">
          Acervo, Biblioteca e Conhecimento mantêm seus relatórios. Auditoria
          administrativa não mede utilização. Bytes únicos, histórico de
          integrações e aceites consolidados exigem fontes próprias; nenhum
          valor é inferido. A Cripta permanece acessível pela ferramenta
          autorizada, sem cartas ou destinatários neste Dashboard.
        </p>
      </details>
    </div>
  );
}
