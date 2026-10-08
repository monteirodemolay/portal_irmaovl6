import { createElement } from "react";
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import { loadDashboardOverview } from "@/modules/admin/lib/load-dashboard-overview";
import {
  csvCell,
  overviewPeriod,
  overviewReportRows,
} from "@/modules/admin/lib/dashboard-overview-model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams,
    format = p.get("format") ?? "csv",
    action = p.get("action") ?? "all";
  if (
    !["csv", "pdf"].includes(format) ||
    !["all", "create", "update", "delete", "restore"].includes(action)
  )
    return NextResponse.json(
      { error: "Formato ou ação inválida." },
      { status: 400 },
    );
  try {
    overviewPeriod(p.get("from") ?? undefined, p.get("to") ?? undefined);
  } catch {
    return NextResponse.json(
      { error: "Intervalo inválido; selecione até um ano." },
      { status: 400 },
    );
  }
  // Reload on the server: no DTO accepted from the browser, no cross-tenant or role cache.
  const data = await loadDashboardOverview(
    p.get("from") ?? undefined,
    p.get("to") ?? undefined,
  );
  if (action !== "all")
    data.audit.items = data.audit.items.filter((a) => a.action === action);
  const rows = [...overviewReportRows(data), ["Filtro de ação", action]],
    filename = `portal-vl6-${data.from}-${data.to}.${format}`;
  const headers = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (format === "csv")
    return new NextResponse(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n"),
      { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } },
    );
  const document = createElement(
    Document,
    null,
    createElement(
      Page,
      {
        size: "A4",
        style: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
      },
      createElement(
        Text,
        { style: { fontSize: 18, marginBottom: 18 } },
        "Portal do Irmão VL6 · Prestação de contas",
      ),
      ...rows.map((row, i) =>
        createElement(
          View,
          {
            key: i,
            wrap: false,
            style: {
              marginBottom: 7,
              paddingBottom: 5,
              borderBottomWidth: 0.3,
              borderBottomColor: "#dce3ea",
            },
          },
          createElement(Text, null, row.join(" · ")),
        ),
      ),
    ),
  );
  const bytes = await renderToBuffer(document);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { ...headers, "Content-Type": "application/pdf" },
  });
}
