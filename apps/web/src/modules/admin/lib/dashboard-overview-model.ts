export const DASHBOARD_TIMEZONE = "America/Sao_Paulo";
export type OverviewMetric = {
  key: string;
  label: string;
  value: number | null;
  detail: string;
  href: string;
  state: "ready" | "failed" | "unsupported";
};
export type OverviewModule = {
  title: string;
  href: string;
  icon:
    | "people"
    | "publication"
    | "archive"
    | "library"
    | "knowledge"
    | "operation";
  metrics: OverviewMetric[];
};
export type OverviewTask = {
  label: string;
  detail: string;
  count: number | null;
  href: string;
  kind: "Pendência" | "Alerta" | "Dica";
};
export type OverviewAudit = {
  id: string;
  at: string;
  action: string;
  entity: string;
  entityId: string;
  actor: string;
};
export type DashboardOverviewData = {
  tenantName: string;
  updatedAt: string;
  from: string;
  to: string;
  modules: OverviewModule[];
  priority: OverviewMetric[];
  tasks: OverviewTask[];
  situations: { label: string; value: number; href: string }[];
  coverage: { active: number; linked: number; unlinked: number } | null;
  agenda: { id: string; title: string; at: string; href: string }[];
  audit: {
    items: OverviewAudit[];
    complete: boolean;
    state: "ready" | "failed" | "forbidden";
    counts: { action: string; label: string; value: number }[];
  };
  failures: string[];
  tools: { href: string; label: string; group: string }[];
};
export function localDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
/** Date-only filters use inclusive start / exclusive end in São Paulo. */
export function overviewPeriod(from?: string, to?: string, now = new Date()) {
  const today = localDate(now);
  const start = from ?? `${today.slice(0, 7)}-01`,
    end = to ?? today;
  if (!validDay(start) || !validDay(end) || start > end)
    throw new Error("Informe um intervalo de datas válido.");
  // Resolve the UTC offset from Intl for the requested local day, including legacy DST.
  const midnight = (day: string) => {
    const nominal = Date.parse(`${day}T00:00:00Z`);
    const offsetAt = (at: number) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: DASHBOARD_TIMEZONE,
        timeZoneName: "longOffset",
      }).formatToParts(new Date(at));
      const name = parts.find((p) => p.type === "timeZoneName")!.value;
      const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
      return match
        ? (match[1] === "+" ? 1 : -1) *
            (Number(match[2]) * 60 + Number(match[3])) *
            60_000
        : 0;
    };
    const guess = nominal - offsetAt(nominal);
    return new Date(nominal - offsetAt(guess));
  };
  const next = new Date(`${end}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const fromDate = midnight(start),
    toDate = midnight(next.toISOString().slice(0, 10));
  if (toDate.getTime() - fromDate.getTime() > 367 * 86400_000)
    throw new Error("Selecione um período de até um ano.");
  return { from: start, to: end, fromDate, toDate };
}
export async function collectOverviewPages<T>(
  load: (
    cursor?: string,
  ) => Promise<{ items: T[]; hasMore: boolean; nextCursor: string | null }>,
  max = 5000,
): Promise<T[]> {
  const result: T[] = [],
    seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await load(cursor);
    result.push(...page.items);
    if (result.length > max)
      throw new Error("Fonte excede o limite de consolidação.");
    if (!page.hasMore) return result;
    if (!page.nextCursor || seen.has(page.nextCursor))
      throw new Error("Paginação incompleta.");
    cursor = page.nextCursor;
    seen.add(cursor);
  } while (cursor);
  return result;
}
export function auditActionCounts(items: { action: string }[]) {
  return [
    ["create", "Criações"],
    ["update", "Alterações"],
    ["delete", "Exclusões"],
    ["restore", "Restaurações"],
  ].map(([action, label]) => ({
    action: action!,
    label: label!,
    value: items.filter((i) => i.action === action).length,
  }));
}
export function csvCell(value: string | number): string {
  const text = String(value),
    safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function overviewReportRows(
  data: DashboardOverviewData,
): (string | number)[][] {
  const rows: (string | number)[][] = [
    ["Portal", data.tenantName],
    ["Período da movimentação", `${data.from} a ${data.to}`],
    ["Fuso", DASHBOARD_TIMEZONE],
    ["Atualização", data.updatedAt],
    [
      "Situação atual",
      "Indicadores de cadastro/conteúdo não são filtrados retroativamente pelo período.",
    ],
    [
      "Cobertura da auditoria",
      data.audit.state === "ready"
        ? data.audit.complete
          ? "Registros do período; apenas entidades com rótulo público conhecido. Não comprova cobertura de todas as operações."
          : "Amostra parcial: limite de consulta atingido. Não representa total do período."
        : data.audit.state,
    ],
    ["Módulo", "Indicador", "Valor", "Regra / estado"],
  ];
  for (const m of data.modules)
    for (const v of m.metrics)
      rows.push([m.title, v.label, v.value ?? "—", `${v.detail} (${v.state})`]);
  rows.push(["Pendências atuais", "Categoria", "Quantidade", "Observação"]);
  for (const t of data.tasks)
    rows.push([t.kind, t.label, t.count ?? "—", t.detail]);
  rows.push([
    "Histórico de auditoria autorizado",
    "Data",
    "Ação",
    "Entidade",
    "ID do registro",
    "Responsável",
  ]);
  for (const a of data.audit.items)
    rows.push(["Evento", a.at, a.action, a.entity, a.entityId, a.actor]);
  for (const f of data.failures) rows.push(["Falha de consulta", f]);
  return rows;
}
