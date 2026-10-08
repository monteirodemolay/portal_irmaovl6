import "server-only";
import { hasPermission } from "@vl6/domain";
import {
  createServerContainer,
  FirestoreKnowledgeRepository,
} from "@vl6/infra";
import {
  MEMBER_SITUATION_STATUSES,
  MEMBER_SITUATION_STATUS_LABELS,
  type PermissionKey,
} from "@vl6/shared";
import { requireSession } from "@/lib/auth/require-session";
import { isAdminTier, isAdminPathAllowed } from "@/lib/auth/is-admin-tier";
import { getCurrentTenant } from "@/lib/tenant/get-current-tenant";
import { notFound } from "next/navigation";
import { ADMIN_TOOLS } from "./admin-tool-directory";
import { AUDIT_ENTITY_LABELS } from "@/lib/audit/audit-action-label";
import {
  auditActionCounts,
  collectOverviewPages,
  overviewPeriod,
  type DashboardOverviewData,
  type OverviewMetric,
  type OverviewModule,
  type OverviewTask,
} from "./dashboard-overview-model";

export async function loadDashboardOverview(
  from?: string,
  to?: string,
): Promise<DashboardOverviewData> {
  const session = await requireSession();
  if (!isAdminTier(session.role) || !isAdminPathAllowed(session.role, "/admin"))
    notFound();
  const ctx = session.authContext,
    tenantId = ctx.tenantId,
    c = createServerContainer(),
    now = new Date();
  const period = overviewPeriod(from, to, now),
    failures: string[] = [];
  const allowed = (href: string) => isAdminPathAllowed(session.role, href);
  const permissionPaths: Partial<Record<PermissionKey, string>> = {
    "member:read": "/admin/pessoas/irmaos",
    "member:manage": "/admin/pessoas/irmaos",
    "user:read": "/admin/pessoas/usuarios",
    "memberCentral:manage": "/admin/pessoas/central",
    "event:read": "/admin/publicacoes",
    "news:read": "/admin/publicacoes",
    "news:manage": "/admin/conteudo/noticias/comentarios",
    "announcement:read": "/admin/conteudo/avisos",
    "link:manage": "/admin/conteudo/links",
    "knowledge:manage": "/admin/conhecimento",
  };
  const can = (p: PermissionKey) =>
    hasPermission(ctx, p) &&
    (!permissionPaths[p] || allowed(permissionPaths[p]!));
  async function safe<T>(
    label: string,
    load: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await load();
    } catch {
      failures.push(label);
      return null;
    }
  }
  const knowledgeAllowed =
    allowed("/admin/conhecimento") &&
    (can("knowledge:manage") || can("tenant:manage"));
  const [
    current,
    members,
    users,
    profiles,
    duplicates,
    contributions,
    comments,
    links,
    news,
    archive,
    archivePublished,
    announcements,
    upcoming,
    legacyFiles,
    legacyAlbums,
    library,
    loans,
    knowledge,
    auditRaw,
  ] = await Promise.all([
    safe("Identificação da Loja", getCurrentTenant),
    can("member:read")
      ? safe("Cadastros", () =>
          collectOverviewPages((cursor) =>
            c.repositories.member.search({ tenantId }, { limit: 200, cursor }),
          ),
        )
      : null,
    can("user:read")
      ? safe("Contas de acesso", () =>
          c.repositories.user.listByTenant(tenantId),
        )
      : null,
    can("memberCentral:manage")
      ? safe("Perfis publicados", () =>
          c.repositories.publicationSettings.countPublishedByTenant(tenantId),
        )
      : null,
    can("member:manage")
      ? safe("Duplicidades", async () => {
          const result = await c.useCases.listDuplicateMembers.execute(ctx);
          if (!result.ok) throw new Error("Consulta indisponível");
          return result.value.length;
        })
      : null,
    can("archiveContribution:manage")
      ? safe("Contribuições", () =>
          c.repositories.archiveContribution.countPendingByTenant(tenantId),
        )
      : null,
    can("news:manage")
      ? safe(
          "Comentários",
          async () =>
            (await c.useCases.listPendingNewsComments.execute(ctx)).length,
        )
      : null,
    can("link:manage")
      ? safe(
          "Sugestões de links",
          async () =>
            (await c.useCases.listPendingLinkSuggestions.execute(ctx)).length,
        )
      : null,
    can("news:read")
      ? safe("Notícias", () =>
          collectOverviewPages((cursor) =>
            c.repositories.news.listAll(tenantId, { limit: 200, cursor }),
          ),
        )
      : null,
    can("archiveItem:read")
      ? safe("Itens do Acervo", () =>
          c.repositories.archiveItem.countByTenant(tenantId),
        )
      : null,
    can("archiveItem:read")
      ? safe("Acervo publicado", () =>
          c.repositories.archiveItem.countPublishedByTenant(tenantId),
        )
      : null,
    can("announcement:read")
      ? safe("Avisos", () =>
          c.repositories.announcement.countPublishedByTenant(tenantId),
        )
      : null,
    can("event:read")
      ? safe("Agenda", async () => {
          const [count, page] = await Promise.all([
            c.repositories.event.countUpcomingByTenant(tenantId, now),
            c.repositories.event.listUpcoming(tenantId, now, { limit: 4 }),
          ]);
          return { count, items: page.items };
        })
      : null,
    can("file:read")
      ? safe("Documentos legados", () =>
          c.repositories.fileAsset.countByTenant(tenantId),
        )
      : null,
    can("gallery:read")
      ? safe("Álbuns legados", () =>
          c.repositories.galleryAlbum.countByTenant(tenantId),
        )
      : null,
    can("libraryItem:read")
      ? safe("Biblioteca", () =>
          c.repositories.libraryItem.countByTenant(tenantId),
        )
      : null,
    can("libraryItem:manage")
      ? safe("Empréstimos", () =>
          c.repositories.libraryCirculation.listLoansByTenant(tenantId),
        )
      : null,
    knowledgeAllowed
      ? safe("Conhecimento", async () => {
          const repo = new FirestoreKnowledgeRepository(c.db);
          const [courses, progress, pending] = await Promise.all([
            repo.listCourses(tenantId),
            repo.listProgress(tenantId),
            repo.listPendingAttempts(tenantId),
          ]);
          const versions = new Map(
            courses.map((course) => [course.id, course.version]),
          );
          const valid = progress.filter(
            (p) => !p.deletedAt && versions.get(p.courseId) === p.courseVersion,
          );
          return {
            courses: courses.filter(
              (course) => course.content.status === "publicado",
            ).length,
            participants: new Set(valid.map((p) => p.userId)).size,
            completions: valid.filter((p) => p.completedAt).length,
            pending: pending.filter(
              (a) => versions.get(a.courseId) === a.version,
            ).length,
          };
        })
      : null,
    can("auditLog:read")
      ? safe("Auditoria do período", async () => {
          // Existing tenant/timestamp index. Projection never transfers snapshots, IPs or private content.
          const snap = await c.db
            .collection("auditLogs")
            .where("tenantId", "==", tenantId)
            .where("timestamp", ">=", period.fromDate)
            .where("timestamp", "<", period.toDate)
            .orderBy("timestamp", "desc")
            .limit(2001)
            .select("timestamp", "acao", "entidade", "entidadeId", "usuarioId")
            .get();
          const labels = {
            ...AUDIT_ENTITY_LABELS,
            knowledgeCourse: "Formação",
            knowledgeAttempt: "Avaliação",
          };
          const known = snap.docs
            .slice(0, 2000)
            .filter((d) =>
              Object.prototype.hasOwnProperty.call(labels, d.get("entidade")),
            );
          const actors = [
            ...new Set(known.map((d) => String(d.get("usuarioId")))),
          ];
          const actorLabels = new Map(
            await Promise.all(
              actors.map(async (id) => {
                if (id === "self-claim")
                  return [id, "Autoatendimento"] as const;
                const user = await c.repositories.user.findById(id);
                if (!user || user.tenantId !== tenantId)
                  return [id, "Responsável não identificado"] as const;
                const member = user.memberId
                  ? await c.repositories.member.findById(user.memberId)
                  : null;
                return [
                  id,
                  member?.tenantId === tenantId
                    ? member.nomeCompleto
                    : user.email,
                ] as const;
              }),
            ),
          );
          return {
            complete: snap.docs.length <= 2000,
            items: known.map((d) => ({
              id: d.id,
              at: d.get("timestamp").toDate().toISOString() as string,
              action: String(d.get("acao")),
              entity:
                labels[d.get("entidade") as keyof typeof labels] ??
                String(d.get("entidade")),
              entityId: String(d.get("entidadeId")),
              actor:
                actorLabels.get(String(d.get("usuarioId"))) ?? "Responsável",
            })),
          };
        })
      : null,
  ]);
  const metric = (
    key: string,
    label: string,
    value: number | null,
    detail: string,
    href: string,
  ): OverviewMetric => ({
    key,
    label,
    value,
    detail,
    href,
    state: value === null ? "failed" : "ready",
  });
  const modules: OverviewModule[] = [],
    tasks: OverviewTask[] = [];
  const active = members?.filter((m) => m.situacao === "ativo") ?? [];
  const userMap = users
    ? new Map(
        users
          .filter(
            (u) =>
              u.tenantId === tenantId &&
              !u.deletedAt &&
              u.ativo &&
              u.statusConta === "active",
          )
          .map((u) => [u.id, u]),
      )
    : null;
  const linked =
    members && userMap
      ? active.filter(
          (m) => m.userId && userMap.get(m.userId)?.memberId === m.id,
        ).length
      : null;
  if (can("member:read") || can("user:read") || can("memberCentral:manage")) {
    const metrics: OverviewMetric[] = [];
    if (can("member:read"))
      metrics.push(
        metric(
          "members",
          "Irmãos cadastrados",
          members?.length ?? null,
          "Membros não excluídos; situação atual.",
          "/admin/pessoas/irmaos",
        ),
        metric(
          "active",
          "Irmãos ativos",
          members ? active.length : null,
          "Situação maçônica ativo; não equivale a contas.",
          "/admin/pessoas/irmaos?situacao=ativo",
        ),
      );
    if (can("user:read"))
      metrics.push(
        metric(
          "accounts",
          "Contas de acesso",
          users?.length ?? null,
          "Total de usuários do tenant; inclui contas sem vínculo.",
          "/admin/pessoas/usuarios",
        ),
      );
    if (can("member:read") && can("user:read"))
      metrics.push(
        metric(
          "linked",
          "Ativos com acesso válido",
          linked,
          "Vínculo recíproco com conta ativa, não excluída e do mesmo tenant.",
          "/admin/pessoas/irmaos?situacao=ativo",
        ),
      );
    if (can("memberCentral:manage"))
      metrics.push(
        metric(
          "profiles",
          "Perfis publicados na Central",
          profiles,
          "Configurações publicadas não suspensas; população distinta dos ativos.",
          "/admin/pessoas/central",
        ),
      );
    modules.push({
      title: "Pessoas e Loja",
      href: "/admin/pessoas/irmaos",
      icon: "people",
      metrics,
    });
  }
  if (can("news:read") || can("event:read") || can("announcement:read")) {
    const metrics: OverviewMetric[] = [];
    if (can("news:read"))
      metrics.push(
        metric(
          "news",
          "Notícias publicadas",
          news?.filter((n) => n.publicado).length ?? null,
          "Não excluídas e publicadas.",
          "/admin/publicacoes",
        ),
        metric(
          "drafts",
          "Notícias em rascunho",
          news?.filter((n) => !n.publicado).length ?? null,
          "Notícias avulsas ou vinculadas; não inclui rascunhos de outros tipos.",
          "/admin/publicacoes",
        ),
      );
    if (can("event:read"))
      metrics.push(
        metric(
          "upcoming",
          "Próximos acontecimentos",
          upcoming?.count ?? null,
          "Data de início futura, incluindo sessões.",
          "/admin/publicacoes",
        ),
      );
    if (can("announcement:read"))
      metrics.push(
        metric(
          "announcements",
          "Avisos publicados",
          announcements,
          "Critério de publicação do repositório de avisos.",
          "/admin/conteudo/avisos",
        ),
      );
    modules.push({
      title: "Publicações e Agenda",
      href: "/admin/publicacoes",
      icon: "publication",
      metrics,
    });
  }
  if (can("archiveItem:read") || can("file:read") || can("gallery:read")) {
    const metrics: OverviewMetric[] = [];
    if (can("archiveItem:read"))
      metrics.push(
        metric(
          "archive",
          "Itens cadastrados",
          archive,
          "Itens não excluídos; inclui rascunhos.",
          "/admin/acervo/publicar",
        ),
        metric(
          "archivePublished",
          "Itens publicados",
          archivePublished,
          "Itens não excluídos e publicados; não somar suas mídias.",
          "/admin/acervo/metricas",
        ),
      );
    if (can("file:read"))
      metrics.push(
        metric(
          "files",
          "Documentos legados",
          legacyFiles,
          "Fonte FileAsset; sem soma com documentos do novo Acervo.",
          "/admin/acervo/arquivos",
        ),
      );
    if (can("gallery:read"))
      metrics.push(
        metric(
          "albums",
          "Álbuns legados",
          legacyAlbums,
          "Fonte GalleryAlbum; eventos com mídia são outra unidade.",
          "/admin/acervo/galeria",
        ),
      );
    modules.push({
      title: "Acervo",
      href: "/admin/acervo/metricas",
      icon: "archive",
      metrics,
    });
  }
  const openLoans = loans?.filter(
    (l) =>
      !l.deletedAt &&
      !l.returnedAt &&
      ["retirado", "atrasado"].includes(l.statusEmprestimo),
  );
  const overdue =
    openLoans?.filter(
      (l) => l.dueAtConfirmed === true && l.dueAt.getTime() < now.getTime(),
    ).length ?? null;
  if (can("libraryItem:read") || can("libraryItem:manage")) {
    const metrics: OverviewMetric[] = [];
    if (can("libraryItem:read"))
      metrics.push(
        metric(
          "library",
          "Obras cadastradas",
          library,
          "Itens da Biblioteca; não representa quantidade de exemplares.",
          "/admin/acervo/biblioteca",
        ),
      );
    if (can("libraryItem:manage"))
      metrics.push(
        metric(
          "loans",
          "Empréstimos retirados em aberto",
          openLoans?.length ?? null,
          "Retirados/atrasados, não devolvidos e não excluídos.",
          "/admin/acervo/biblioteca/emprestimos",
        ),
        metric(
          "overdue",
          "Empréstimos vencidos",
          overdue,
          "Vencimento confirmado e anterior à atualização.",
          "/admin/acervo/biblioteca/emprestimos",
        ),
      );
    modules.push({
      title: "Biblioteca",
      href: "/admin/acervo/biblioteca",
      icon: "library",
      metrics,
    });
  }
  if (knowledgeAllowed)
    modules.push({
      title: "Conhecimento",
      href: "/admin/conhecimento",
      icon: "knowledge",
      metrics: [
        metric(
          "courses",
          "Formações publicadas",
          knowledge?.courses ?? null,
          "Cursos não excluídos com status publicado.",
          "/admin/conhecimento",
        ),
        metric(
          "participants",
          "Participantes registrados",
          knowledge?.participants ?? null,
          "Usuários distintos com progresso na versão atual; sem matrícula obrigatória.",
          "/admin/conhecimento/relatorios",
        ),
        metric(
          "completions",
          "Conclusões registradas",
          knowledge?.completions ?? null,
          "Registros de progresso concluídos na versão atual; não pessoas distintas.",
          "/admin/conhecimento/relatorios",
        ),
      ],
    });
  const addTask = (
    permission: boolean,
    count: number | null,
    label: string,
    detail: string,
    href: string,
    kind: OverviewTask["kind"] = "Pendência",
  ) => {
    if (permission && count !== null && count > 0 && allowed(href))
      tasks.push({ label, detail, count, href, kind });
  };
  addTask(
    can("member:manage"),
    duplicates,
    "Revisar grupos de possíveis duplicidades",
    "Grupos de cadastros; não pessoas. Sem prazo definido.",
    "/admin/pessoas/irmaos/duplicados",
  );
  addTask(
    can("archiveContribution:manage"),
    contributions,
    "Conferir contribuições do Acervo",
    "Envios aguardando moderação; sem prazo definido.",
    "/admin/acervo/contribuicoes",
  );
  addTask(
    can("news:manage"),
    comments,
    "Moderar comentários de notícias",
    "Comentários aguardando aprovação; sem prazo definido.",
    "/admin/conteudo/noticias/comentarios",
  );
  addTask(
    can("link:manage"),
    links,
    "Avaliar sugestões de links",
    "Sugestões aguardando decisão; sem prazo definido.",
    "/admin/conteudo/links",
  );
  addTask(
    can("libraryItem:manage"),
    overdue,
    "Conferir empréstimos vencidos",
    "Prazo de devolução confirmado; não houve envio de aviso.",
    "/admin/acervo/biblioteca/emprestimos",
    "Alerta",
  );
  addTask(
    knowledgeAllowed,
    knowledge?.pending ?? null,
    "Revisar avaliações do Conhecimento",
    "Tentativas com revisão humana pendente na versão atual.",
    "/admin/conhecimento/revisoes",
  );
  const unclaimed =
    members?.filter((m) => m.situacao === "ativo" && !m.userId).length ?? null;
  addTask(
    can("member:read"),
    unclaimed,
    "Orientar a reivindicação de cadastro",
    "Ativos sem userId. O destino mostra todos os ativos; confira quais não têm vínculo.",
    "/admin/pessoas/irmaos?situacao=ativo",
    "Dica",
  );
  addTask(
    can("news:read"),
    news?.filter((n) => !n.publicado).length ?? null,
    "Retomar notícias em rascunho",
    "Confira vínculos com o acontecimento e arquivos antes de publicar.",
    "/admin/publicacoes",
    "Dica",
  );
  const operationTools = ADMIN_TOOLS.filter(
    (tool) => allowed(tool.href) && tool.permissions.some(can),
  );
  const operationMetrics: OverviewMetric[] = [];
  if (
    can("legalDocument:manage") &&
    allowed("/admin/configuracoes/termos-e-privacidade")
  )
    operationMetrics.push({
      key: "legal",
      label: "Termos e aceites",
      value: null,
      state: "unsupported",
      detail:
        "Consulte o relatório existente por documento e versão; não consolidado nesta visão.",
      href: "/admin/configuracoes/termos-e-privacidade",
    });
  if (can("tenant:manage") && allowed("/admin/configuracoes/integracoes"))
    operationMetrics.push({
      key: "integrations",
      label: "Execuções de integrações",
      value: null,
      state: "unsupported",
      detail:
        "Chaves e agenda de cron não comprovam execução; telemetria não consolidada.",
      href: "/admin/configuracoes/integracoes",
    });
  if (can("tenant:manage") && allowed("/admin/cripta"))
    operationMetrics.push({
      key: "cripta",
      label: "Cripta · operação restrita",
      value: null,
      state: "unsupported",
      detail:
        "Somente a ferramenta operacional autorizada; sem cartas, destinatários ou anexos neste painel.",
      href: "/admin/cripta",
    });
  if (operationMetrics.length)
    modules.push({
      title: "Gestão e operação",
      href: "/admin/configuracoes",
      icon: "operation",
      metrics: operationMetrics,
    });
  const auditState = !can("auditLog:read")
    ? "forbidden"
    : auditRaw
      ? "ready"
      : "failed";
  const audit = {
    state: auditState,
    complete: auditRaw?.complete ?? false,
    items: auditRaw?.items ?? [],
    counts: auditActionCounts(auditRaw?.items ?? []),
  } as DashboardOverviewData["audit"];
  return {
    tenantName: current?.tenant.nome ?? "Portal do Irmão VL6",
    updatedAt: now.toISOString(),
    from: period.from,
    to: period.to,
    modules,
    tasks,
    priority: ["active", "linked", "news", "archivePublished"].flatMap((key) =>
      modules.flatMap((m) => m.metrics).filter((m) => m.key === key),
    ),
    situations: members
      ? MEMBER_SITUATION_STATUSES.map((s) => ({
          label: MEMBER_SITUATION_STATUS_LABELS[s],
          value: members.filter((m) => m.situacao === s).length,
          href: `/admin/pessoas/irmaos?situacao=${s}`,
        }))
      : [],
    coverage:
      members && linked !== null
        ? { active: active.length, linked, unlinked: active.length - linked }
        : null,
    agenda:
      upcoming?.items.map((e) => ({
        id: e.id,
        title: e.titulo,
        at: e.dataInicio.toISOString(),
        href: "/admin/publicacoes",
      })) ?? [],
    audit,
    failures,
    tools: operationTools.map(({ href, label, group }) => ({
      href,
      label,
      group,
    })),
  };
}
