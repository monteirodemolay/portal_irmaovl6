import { describe, expect, it } from "vitest";
import { editorialDate, filterEditorialItems } from "./publication-filters";
const base = {
  type: "Notícia",
  status: "Rascunho",
  publishedAt: null,
  happenedAt: null,
  scheduledAt: null,
};
const items = [
  { ...base, id: "old", title: "Z antigo", createdAt: "2024-01-01T12:00:00Z" },
  { ...base, id: "new", title: "A novo", publishedAt: "2026-10-07T12:00:00Z" },
  { ...base, id: "none", title: "Sem data" },
];
const filters = {
  query: "",
  type: "Todos",
  status: "Todos",
  year: "Todos",
  order: "newest",
};
describe("Filtros de publicações", () => {
  it("ordena da mais nova à mais antiga sem alterar a fonte", () => {
    expect(filterEditorialItems(items, filters).map((i) => i.id)).toEqual([
      "new",
      "old",
      "none",
    ]);
    expect(items[0]!.id).toBe("old");
  });
  it("inverte a ordem mantendo registros sem data no final", () => {
    expect(
      filterEditorialItems(items, { ...filters, order: "oldest" }).map(
        (i) => i.id,
      ),
    ).toEqual(["old", "new", "none"]);
  });
  it("combina ano, título, tipo e situação", () => {
    expect(
      filterEditorialItems(items, {
        ...filters,
        year: "2024",
        query: " Z ",
        type: "Notícia",
        status: "Rascunho",
      }).map((i) => i.id),
    ).toEqual(["old"]);
    expect(
      filterEditorialItems(items, { ...filters, status: "Publicado" }),
    ).toEqual([]);
  });
  it("considera o ano local e ignora datas inválidas", () => {
    const item = {
      ...items[0]!,
      publishedAt: "inválida",
      happenedAt: "2026-01-01T01:00:00Z",
    };
    expect(editorialDate(item)).toBe(item.happenedAt);
    expect(
      filterEditorialItems([item], { ...filters, year: "2025" }),
    ).toHaveLength(1);
  });
});
