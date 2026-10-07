// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PublicationCenter, type EditorialItem } from "./publication-center";

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
});
const base: EditorialItem = {
  id: "news:n1",
  title: "Notícia de instrução",
  type: "Notícia",
  status: "Rascunho",
  href: "/admin/conteudo/noticias/n1",
  eventId: "event-1",
  happenedAt: new Date().toISOString(),
  publishedAt: null,
  scheduledAt: null,
  expiresAt: null,
  destination: "Notícias do Portal",
};
async function render(items: EditorialItem[], errors: string[] = []) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      createElement(PublicationCenter, {
        items,
        errors,
        createLinks: [
          { href: "/admin/conteudo/agenda/novo", label: "Sessão ou evento" },
        ],
      }),
    ),
  );
}
describe("Central editorial", () => {
  it("mantém falha parcial visível sem esconder os itens disponíveis", async () => {
    await render([base], ["Avisos"]);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Avisos",
    );
    expect(
      host.querySelector('a[href="/admin/conteudo/noticias/n1"]')?.textContent,
    ).toContain(base.title);
    expect(
      host.querySelector('a[href="/admin/publicacoes/event-1"]'),
    ).not.toBeNull();
  });
  it("filtra por tipo e mantém o formulário específico no menu Criar", async () => {
    await render([
      base,
      {
        ...base,
        id: "art:p1",
        title: "Arte externa",
        type: "Arte",
        eventId: null,
      },
    ]);
    const select = [...host.querySelectorAll("select")][0]!;
    await act(async () => {
      select.value = "Notícia";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.textContent).toContain(base.title);
    expect(host.textContent).not.toContain("Arte externa");
    expect(
      host.querySelector('a[href="/admin/conteudo/agenda/novo"]')?.textContent,
    ).toBe("Sessão ou evento");
  });
  it("não transforma acontecimento futuro em agendamento editorial", async () => {
    await render([base]);
    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((b) => b.textContent === "Calendário editorial")!
        .click();
    });
    expect(
      host.querySelector('a[href="/admin/conteudo/noticias/n1"]'),
    ).not.toBeNull();
    const dateSelect = [...host.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.value === "scheduledAt"),
    )!;
    await act(async () => {
      dateSelect.value = "scheduledAt";
      dateSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      host.querySelector('a[href="/admin/conteudo/noticias/n1"]'),
    ).toBeNull();
  });
  it("mostra ordem decrescente, filtra ano e restaura filtros", async () => {
    await render([
      {
        ...base,
        id: "old",
        title: "Z antigo",
        happenedAt: "2024-02-01T12:00:00Z",
      },
      {
        ...base,
        id: "new",
        title: "A recente",
        happenedAt: "2026-02-01T12:00:00Z",
      },
    ]);
    expect(
      [...host.querySelectorAll("article")].map((a) => a.textContent),
    ).toEqual([
      expect.stringContaining("A recente"),
      expect.stringContaining("Z antigo"),
    ]);
    const year = [...host.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.value === "2024"),
    )!;
    await act(async () => {
      year.value = "2024";
      year.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelectorAll("article")).toHaveLength(1);
    expect(host.querySelector("article")?.textContent).toContain("Z antigo");
    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((b) => b.textContent === "Limpar filtros")!
        .click();
    });
    expect(host.querySelectorAll("article")).toHaveLength(2);
    const order = [...host.querySelectorAll("select")].find((s) =>
      [...s.options].some((o) => o.value === "oldest"),
    )!;
    await act(async () => {
      order.value = "oldest";
      order.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.querySelector("article")?.textContent).toContain("Z antigo");
  });
  it("apresenta ausência de dados", async () => {
    await render([]);
    expect(host.textContent).toContain("Nenhum conteúdo encontrado");
  });
});
