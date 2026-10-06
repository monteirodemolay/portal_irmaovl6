import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { KnowledgeAdmin } from '@/modules/knowledge/components/knowledge-admin';
import { requireKnowledgeManager } from '@/modules/knowledge/lib/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gestão do Conhecimento VL6' };
export default async function KnowledgeAdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const path = (await params).path ?? [];
  if (path.length > 2 || !['', 'novo', 'editar', 'revisoes', 'relatorios'].includes(path[0] ?? ''))
    notFound();
  const ctx = await requireKnowledgeManager(),
    tenantId = ctx.session.authContext.tenantId;
  const [courses, progress, library, pending, members] = await Promise.all([
    ctx.repo.listCourses(tenantId),
    ctx.repo.listProgress(tenantId),
    hasPermission(ctx.session.authContext, 'libraryItem:read')
      ? ctx.container.repositories.libraryItem.listByTenant(tenantId)
      : Promise.resolve([]),
    ctx.repo.listPendingAttempts(tenantId),
    ctx.container.repositories.member.search({ tenantId }, { limit: 200 }),
  ]);
  const course = courses.find((c) => c.id === path[1]);
  if (path[0] === 'editar' && !course) notFound();
  const versions = course ? await ctx.repo.listVersions(tenantId, course.id) : [];
  return (
    <KnowledgeAdmin
      tenantId={tenantId}
      courses={courses}
      progress={progress}
      books={library
        .filter((b) => !b.deletedAt && b.ativo)
        .map((b) => ({ id: b.id, title: b.titulo ?? 'Publicação' }))}
      path={path}
      pending={pending}
      members={members.items.map((m) => ({ id: m.id, name: m.nomeCompleto }))}
      versions={versions}
    />
  );
}
