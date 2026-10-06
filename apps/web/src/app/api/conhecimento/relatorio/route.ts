import { NextResponse } from 'next/server';
import { hasPermission } from '@vl6/domain';
import { createServerContainer, FirestoreKnowledgeRepository } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
export const runtime = 'nodejs';
const csv = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export async function GET() {
  const session = await getCurrentSession();
  if (
    !session ||
    !(
      hasPermission(session.authContext, 'knowledge:manage') ||
      hasPermission(session.authContext, 'tenant:manage')
    )
  )
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const c = createServerContainer(),
    repo = new FirestoreKnowledgeRepository(c.db),
    tenantId = session.authContext.tenantId;
  const [courses, progress] = await Promise.all([
    repo.listCourses(tenantId),
    repo.listProgress(tenantId),
  ]);
  const rows = [
    ['Irmão', 'Formação', 'Versão', 'Conteúdos concluídos', 'Situação', 'Aproveitamento'],
  ];
  for (const p of progress) {
    const member = await c.repositories.member.findById(p.memberId),
      course = courses.find((c) => c.id === p.courseId),
      scores = p.attempts.filter((a) => a.score !== null);
    rows.push([
      member?.tenantId === tenantId ? member.nomeCompleto : 'Cadastro indisponível',
      course?.content.title ?? 'Formação arquivada',
      String(p.courseVersion),
      String(p.completedLessonIds.length),
      p.courseVersion !== course?.version
        ? 'Versão anterior'
        : p.completedAt
          ? 'Concluído'
          : 'Em andamento',
      scores.length
        ? String(Math.round(scores.reduce((n, a) => n + a.score!, 0) / scores.length))
        : '',
    ]);
  }
  return new NextResponse('\ufeff' + rows.map((r) => r.map(csv).join(';')).join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="conhecimento-vl6.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
