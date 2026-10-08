import { describe, it, expect } from "vitest";
import {
  overviewPeriod,
  localDate,
  collectOverviewPages,
  auditActionCounts,
  csvCell,
} from "./dashboard-overview-model";
describe("Dashboard: datas, paginação e relatórios", () => {
  it("usa o dia local e intervalo inclusivo/exclusivo em São Paulo", () => {
    expect(localDate(new Date("2026-01-01T01:00:00Z"))).toBe("2025-12-31");
    const p = overviewPeriod("2026-10-01", "2026-10-07");
    expect(p.fromDate.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(p.toDate.toISOString()).toBe("2026-10-08T03:00:00.000Z");
  });
  it("rejeita dias inexistentes, datas invertidas e varreduras longas", () => {
    expect(() => overviewPeriod("2026-02-30", "2026-03-01")).toThrow();
    expect(() => overviewPeriod("2026-10-07", "2026-10-01")).toThrow();
    expect(() => overviewPeriod("2024-01-01", "2026-10-07")).toThrow();
  });
  it("consolida todas as páginas e recusa cursor ausente ou repetido", async () => {
    const pages = [
      { items: [1], hasMore: true, nextCursor: "a" },
      { items: [2], hasMore: false, nextCursor: null },
    ];
    expect(await collectOverviewPages(async () => pages.shift()!)).toEqual([
      1, 2,
    ]);
    await expect(
      collectOverviewPages(async () => ({
        items: [1],
        hasMore: true,
        nextCursor: null,
      })),
    ).rejects.toThrow();
    await expect(
      collectOverviewPages(async () => ({
        items: [1],
        hasMore: true,
        nextCursor: "a",
      })),
    ).rejects.toThrow();
    await expect(
      collectOverviewPages(
        async () => ({ items: [1, 2], hasMore: false, nextCursor: null }),
        1,
      ),
    ).rejects.toThrow();
  });
  it("conta eventos independentes, preservando exclusão e restauração", () => {
    expect(
      auditActionCounts([
        { action: "delete" },
        { action: "restore" },
        { action: "update" },
        { action: "update" },
        { action: "login" },
      ]).map((a) => a.value),
    ).toEqual([0, 2, 1, 1]);
  });
  it("protege CSV contra fórmulas e preserva aspas e quebras", () => {
    expect(csvCell(' =HYPERLINK("url")')).toBe('"\' =HYPERLINK(""url"")"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(0)).toBe('"0"');
  });
});
