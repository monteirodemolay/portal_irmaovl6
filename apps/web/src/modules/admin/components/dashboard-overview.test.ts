// @vitest-environment jsdom
import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardOverviewData } from "../lib/dashboard-overview-model";
const fixture = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: fixture.push, refresh: fixture.refresh }),
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", props, children),
}));
vi.mock("@vl6/ui", () => {
  const Icon = () => null;
  return {
    Archive: Icon,
    ArrowUpRight: Icon,
    CalendarDays: Icon,
    Library: Icon,
    Users: Icon,
    ShieldCheck: Icon,
  };
});
vi.mock("./admin-tool-directory", () => ({ AdminToolDirectory: () => null }));
import { DashboardOverview } from "./dashboard-overview";
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined, host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
});
const data: DashboardOverviewData = {
  tenantName: "Loja A",
  from: "2026-10-01",
  to: "2026-10-07",
  updatedAt: "2026-10-07T12:00:00Z",
  priority: [],
  modules: [
    {
      title: "Acervo",
      icon: "archive",
      href: "/admin/acervo",
      metrics: [
        {
          key: "archive",
          label: "Itens publicados",
          value: 0,
          detail: "Fonte real",
          href: "/admin/acervo/metricas",
          state: "ready",
        },
      ],
    },
  ],
  tasks: [
    {
      kind: "Dica",
      count: 1,
      label: "Retomar rascunho",
      detail: "Orientação opcional",
      href: "/admin/publicacoes",
    },
    {
      kind: "Pendência",
      count: 2,
      label: "Revisar contribuições",
      detail: "Registros pendentes",
      href: "/admin/acervo/contribuicoes",
    },
  ],
  situations: [],
  coverage: null,
  agenda: [],
  audit: { items: [], complete: true, state: "forbidden", counts: [] },
  failures: [],
  tools: [],
};
async function render(value = data) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(createElement(DashboardOverview, { data: value })),
  );
}
describe("Visão geral integrada", () => {
  it("abre composição do módulo preservando zero real", async () => {
    await render();
    const button = host.querySelector(
      '[aria-controls="dashboard-module-detail"]',
    ) as HTMLButtonElement;
    await act(async () => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(
      host.querySelector("#dashboard-module-detail")?.textContent,
    ).toContain("Fonte real");
    expect(
      host.querySelector("#dashboard-module-detail")?.textContent,
    ).toContain("0");
  });
  it("dispensa dica opcional, mantendo pendências", async () => {
    await render();
    const button = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Agora não",
    )!;
    await act(async () => button.click());
    expect(host.textContent).not.toContain("Retomar rascunho");
    expect(host.textContent).toContain("Revisar contribuições");
  });
  it("exportações preservam o período e falha continua explícita", async () => {
    await render({ ...data, failures: ["Acervo"] });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Acervo",
    );
    const csv = host.querySelector('a[href*="format=csv"]')!;
    expect(csv.getAttribute("href")).toContain("from=2026-10-01");
    expect(csv.getAttribute("href")).toContain("to=2026-10-07");
  });
});
