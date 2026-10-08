import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import type { DashboardOverviewData } from "@/modules/admin/lib/dashboard-overview-model";
const fixture = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/modules/admin/lib/load-dashboard-overview", () => ({
  loadDashboardOverview: fixture.load,
}));
import { GET } from "./route";
const data: DashboardOverviewData = {
  tenantName: "Loja A",
  from: "2026-10-01",
  to: "2026-10-07",
  updatedAt: "2026-10-07T12:00:00Z",
  modules: [],
  priority: [],
  tasks: [],
  situations: [],
  coverage: null,
  agenda: [],
  audit: { items: [], complete: true, state: "ready", counts: [] },
  failures: [],
  tools: [],
};
describe("Relatórios do Dashboard", () => {
  it("rejeita formato e intervalo inválidos antes de consultar", async () => {
    const r = await GET(
      new NextRequest(
        "http://localhost/api/admin/dashboard/report?format=html",
      ),
    );
    expect(r.status).toBe(400);
    const bad = await GET(
      new NextRequest(
        "http://localhost/api/admin/dashboard/report?from=2026-02-30&to=2026-03-01",
      ),
    );
    expect(bad.status).toBe(400);
    expect(fixture.load).not.toHaveBeenCalled();
  });
  it("emite CSV com período, cobertura e cache privado", async () => {
    fixture.load.mockResolvedValue(structuredClone(data));
    const r = await GET(
      new NextRequest(
        "http://localhost/api/admin/dashboard/report?format=csv&from=2026-10-01&to=2026-10-07",
      ),
    );
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    expect(r.headers.get("Content-Type")).toContain("text/csv");
    const body = await r.text();
    expect(body).toContain("America/Sao_Paulo");
    expect(body).toContain("Cobertura da auditoria");
  });
  it("gera bytes PDF reais com o renderer existente", async () => {
    fixture.load.mockResolvedValue(structuredClone(data));
    const r = await GET(
      new NextRequest(
        "http://localhost/api/admin/dashboard/report?format=pdf&from=2026-10-01&to=2026-10-07",
      ),
    );
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    const bytes = Buffer.from(await r.arrayBuffer());
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
