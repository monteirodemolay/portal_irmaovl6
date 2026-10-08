import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => {
  const permissions: string[] = [],
    blocked: string[] = [];
  const c = {
    db: { collection: vi.fn() },
    repositories: {
      member: { search: vi.fn(), findById: vi.fn() },
      user: { listByTenant: vi.fn(), findById: vi.fn() },
      publicationSettings: { countPublishedByTenant: vi.fn() },
      archiveContribution: { countPendingByTenant: vi.fn() },
      news: { listAll: vi.fn() },
      archiveItem: { countByTenant: vi.fn(), countPublishedByTenant: vi.fn() },
      announcement: { countPublishedByTenant: vi.fn() },
      event: { countUpcomingByTenant: vi.fn(), listUpcoming: vi.fn() },
      fileAsset: { countByTenant: vi.fn() },
      galleryAlbum: { countByTenant: vi.fn() },
      libraryItem: { countByTenant: vi.fn() },
      libraryCirculation: { listLoansByTenant: vi.fn() },
    },
    useCases: {
      listDuplicateMembers: { execute: vi.fn() },
      listPendingNewsComments: { execute: vi.fn() },
      listPendingLinkSuggestions: { execute: vi.fn() },
    },
  };
  return {
    permissions,
    blocked,
    c,
    courses: vi.fn(),
    progress: vi.fn(),
    pending: vi.fn(),
  };
});
vi.mock("server-only", () => ({}));
vi.mock("@vl6/domain", () => ({
  hasPermission: (_ctx: unknown, p: string) => fixture.permissions.includes(p),
}));
vi.mock("@vl6/shared", () => ({
  MEMBER_SITUATION_STATUSES: ["ativo", "falecido"],
  MEMBER_SITUATION_STATUS_LABELS: { ativo: "Ativo", falecido: "Falecido" },
}));
vi.mock("@vl6/infra", () => ({
  createServerContainer: () => fixture.c,
  FirestoreKnowledgeRepository: class {
    listCourses = fixture.courses;
    listProgress = fixture.progress;
    listPendingAttempts = fixture.pending;
  },
}));
vi.mock("@/lib/auth/require-session", () => ({
  requireSession: async () => ({
    role: {},
    authContext: { tenantId: "loja-a", uid: "gestor" },
  }),
}));
vi.mock("@/lib/auth/is-admin-tier", () => ({
  isAdminTier: () => true,
  isAdminPathAllowed: (_role: unknown, path: string) =>
    !fixture.blocked.some((p) => path.startsWith(p)),
}));
vi.mock("@/lib/tenant/get-current-tenant", () => ({
  getCurrentTenant: async () => ({ tenant: { nome: "Loja A" } }),
}));
vi.mock("./admin-tool-directory", () => ({ ADMIN_TOOLS: [] }));
vi.mock("@/lib/audit/audit-action-label", () => ({
  AUDIT_ENTITY_LABELS: { members: "Irmão" },
}));
import { loadDashboardOverview } from "./load-dashboard-overview";
const page = (items: unknown[]) => ({
  items,
  hasMore: false,
  nextCursor: null,
});
beforeEach(() => {
  vi.clearAllMocks();
  fixture.permissions.length = 0;
  fixture.blocked.length = 0;
});
describe("Dashboard: fontes autorizadas e populações", () => {
  it("auditoria projeta metadados, exclui Cripta e identifica cobertura parcial", async () => {
    fixture.permissions.push("auditLog:read");
    const doc = (id: string, entity: string) => ({
      id,
      get: (key: string) =>
        ({
          timestamp: { toDate: () => new Date("2026-10-07T12:00:00Z") },
          acao: "delete",
          entidade: entity,
          entidadeId: "registro",
          usuarioId: "gestor",
        })[key as "acao"],
    });
    const chain = {
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      select: vi.fn(),
      get: vi.fn(),
    };
    for (const method of [
      chain.where,
      chain.orderBy,
      chain.limit,
      chain.select,
    ])
      method.mockReturnValue(chain);
    chain.get.mockResolvedValue({
      docs: [
        doc("private", "criptaLetters"),
        ...Array.from({ length: 2000 }, (_, i) => doc(String(i), "members")),
      ],
    });
    fixture.c.db.collection.mockReturnValue(chain);
    fixture.c.repositories.user.findById.mockResolvedValue({
      tenantId: "outra-loja",
      email: "privado@outra-loja",
    });
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(data.audit.complete).toBe(false);
    expect(data.audit.items.some((a) => a.id === "private")).toBe(false);
    expect(data.audit.items[0]?.actor).toBe("Responsável não identificado");
    expect(chain.where.mock.calls[0]).toEqual(["tenantId", "==", "loja-a"]);
    expect(chain.select.mock.calls[0]).not.toContain("valorAnterior");
    expect(chain.select.mock.calls[0]).not.toContain("valorNovo");
  });
  it("não consulta fontes sem permissão", async () => {
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(data.modules).toEqual([]);
    expect(data.audit.state).toBe("forbidden");
    expect(fixture.c.repositories.member.search).not.toHaveBeenCalled();
    expect(fixture.c.db.collection).not.toHaveBeenCalled();
  });
  it("não consulta cadastros administrativos bloqueados por caminho", async () => {
    fixture.permissions.push("member:read");
    fixture.blocked.push("/admin/pessoas");
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(data.modules).toEqual([]);
    expect(fixture.c.repositories.member.search).not.toHaveBeenCalled();
  });
  it("valida vínculo recíproco e tenant sem dividir todas as contas pelos membros", async () => {
    fixture.permissions.push("member:read", "user:read");
    fixture.c.repositories.member.search.mockResolvedValue(
      page([
        { id: "m1", situacao: "ativo", userId: "u1" },
        { id: "m2", situacao: "ativo", userId: "u2" },
        { id: "m3", situacao: "ativo", userId: null },
      ]),
    );
    fixture.c.repositories.user.listByTenant.mockResolvedValue([
      {
        id: "u1",
        memberId: "m1",
        tenantId: "loja-a",
        ativo: true,
        statusConta: "active",
      },
      {
        id: "u2",
        memberId: "m2",
        tenantId: "loja-b",
        ativo: true,
        statusConta: "active",
      },
    ]);
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(data.coverage).toEqual({ active: 3, linked: 1, unlinked: 2 });
    expect(
      fixture.c.repositories.member.search.mock.calls[0]?.[0]?.tenantId,
    ).toBe("loja-a");
  });
  it("mantém o restante do painel quando uma fonte falha", async () => {
    fixture.permissions.push("member:read", "archiveItem:read");
    fixture.c.repositories.member.search.mockRejectedValue(
      new Error("offline"),
    );
    fixture.c.repositories.archiveItem.countByTenant.mockResolvedValue(9);
    fixture.c.repositories.archiveItem.countPublishedByTenant.mockResolvedValue(
      4,
    );
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(data.failures).toContain("Cadastros");
    expect(
      data.modules.flatMap((m) => m.metrics).find((m) => m.key === "active")
        ?.value,
    ).toBeNull();
    expect(data.priority.find((m) => m.key === "archivePublished")?.value).toBe(
      4,
    );
  });
  it("inclui o plano de ação para moderador exclusivo de notícias", async () => {
    fixture.permissions.push("news:manage");
    fixture.c.useCases.listPendingNewsComments.execute.mockResolvedValue([
      {},
      {},
    ]);
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(data.tasks[0]?.count).toBe(2);
    expect(data.tasks[0]?.href).toContain("comentarios");
  });
  it("não chama empréstimo sem vencimento confirmado de atrasado", async () => {
    fixture.permissions.push("libraryItem:manage");
    fixture.c.repositories.libraryCirculation.listLoansByTenant.mockResolvedValue(
      [
        {
          statusEmprestimo: "retirado",
          dueAt: new Date("2020-01-01"),
          dueAtConfirmed: false,
        },
        {
          statusEmprestimo: "retirado",
          dueAt: new Date("2020-01-01"),
          dueAtConfirmed: true,
        },
        {
          statusEmprestimo: "devolvido",
          returnedAt: new Date(),
          dueAt: new Date("2020-01-01"),
          dueAtConfirmed: true,
        },
      ],
    );
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(
      data.modules[0]?.metrics.find((m) => m.key === "overdue")?.value,
    ).toBe(1);
  });
  it("usa status publicado, versão atual e participantes distintos no Conhecimento", async () => {
    fixture.permissions.push("knowledge:manage");
    fixture.courses.mockResolvedValue([
      { id: "c1", version: 2, content: { status: "publicado" } },
    ]);
    fixture.progress.mockResolvedValue([
      { userId: "u1", courseId: "c1", courseVersion: 2 },
      { userId: "u2", courseId: "c1", courseVersion: 1 },
    ]);
    fixture.pending.mockResolvedValue([
      { courseId: "c1", version: 2 },
      { courseId: "c1", version: 1 },
    ]);
    const data = await loadDashboardOverview("2026-10-01", "2026-10-07");
    expect(
      data.modules[0]?.metrics.find((m) => m.key === "courses")?.value,
    ).toBe(1);
    expect(
      data.modules[0]?.metrics.find((m) => m.key === "participants")?.value,
    ).toBe(1);
    expect(data.tasks[0]?.count).toBe(1);
  });
});
