import 'server-only';
import { randomUUID } from 'node:crypto';
import { cache } from 'react';
import {
  createServerContainer,
  FirestoreKnowledgeRepository,
  knowledgeProgressId,
} from '@vl6/infra';
import {
  KnowledgeOperationError,
  canReadKnowledge,
  hasPermission,
  isKnowledgeComplete,
  toKnowledgeMemberCourse,
  type KnowledgeCourse,
  type KnowledgeProgress,
} from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';
import { notFound } from 'next/navigation';

export const getKnowledgeContext = cache(async () => {
  const session = await requireSession(),
    container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.authContext.uid,
  );
  const canManage =
    hasPermission(session.authContext, 'knowledge:manage') ||
    hasPermission(session.authContext, 'tenant:manage');
  return {
    session,
    container,
    member,
    canManage,
    repo: new FirestoreKnowledgeRepository(container.db),
  };
});
export async function requireKnowledgeManager() {
  const ctx = await getKnowledgeContext();
  if (!ctx.canManage) notFound();
  return ctx;
}
export async function requireKnowledgeMember() {
  const ctx = await getKnowledgeContext();
  if (
    !ctx.member ||
    ctx.member.deletedAt ||
    !ctx.member.ativo ||
    ctx.member.userId !== ctx.session.authContext.uid
  )
    notFound();
  return ctx;
}
export async function getReadableCourse(id: string) {
  const ctx = await requireKnowledgeMember(),
    course = await ctx.repo.findCourse(id);
  if (
    !course ||
    !canReadKnowledge(
      ctx.member,
      course,
      ctx.session.authContext.tenantId,
      ctx.session.authContext.uid,
    )
  )
    notFound();
  return { ...ctx, course };
}
export async function getKnowledgeMemberData() {
  const ctx = await requireKnowledgeMember();
  const [all, history] = await Promise.all([
    ctx.repo.listCourses(ctx.session.authContext.tenantId),
    ctx.repo.listProgress(ctx.session.authContext.tenantId, ctx.session.authContext.uid),
  ]);
  const courses = all.filter((c) =>
    canReadKnowledge(ctx.member, c, ctx.session.authContext.tenantId, ctx.session.authContext.uid),
  );
  const progress = history.filter((p) =>
    courses.some((c) => c.id === p.courseId && c.version === p.courseVersion),
  );
  return {
    courses: courses.map(toKnowledgeMemberCourse),
    progress,
    name: ctx.member!.nomeCompleto,
    degree: ctx.member!.grau,
    canManage: ctx.canManage,
  };
}
export function prepareKnowledgeProgress(
  course: KnowledgeCourse,
  before: KnowledgeProgress | null,
  tenantId: string,
  uid: string,
  memberId: string,
): KnowledgeProgress {
  if (before && before.courseVersion === course.version)
    return { ...before, updatedAt: new Date(), updatedBy: uid };
  const now = new Date();
  return {
    id: knowledgeProgressId(tenantId, uid, course.id),
    tenantId,
    userId: uid,
    memberId,
    courseId: course.id,
    courseVersion: course.version,
    completedLessonIds: [],
    lastLessonId: null,
    positions: {},
    attemptCounts: {},
    attempts: [],
    completedAt: null,
    certificateCode: null,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
    createdBy: uid,
    updatedBy: uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}
export function finalizeKnowledgeProgress(
  course: KnowledgeCourse,
  p: KnowledgeProgress,
): KnowledgeProgress {
  if (isKnowledgeComplete(course, p)) {
    return {
      ...p,
      completedAt: p.completedAt ?? new Date().toISOString(),
      certificateCode: course.content.certificate ? (p.certificateCode ?? randomUUID()) : null,
    };
  }
  return { ...p, completedAt: null, certificateCode: null };
}
export async function getLibraryReferences(ids: string[]) {
  const ctx = await getKnowledgeContext();
  if (!hasPermission(ctx.session.authContext, 'libraryItem:read')) return [];
  const unique = Array.from(new Set(ids));
  const items = await Promise.all(
    unique.map((id) => ctx.container.repositories.libraryItem.findById(id)),
  );
  return items
    .filter((x) => x && x.tenantId === ctx.session.authContext.tenantId && !x.deletedAt && x.ativo)
    .map((x) => ({
      id: x!.id,
      title: x!.titulo ?? 'Publicação',
      author: x!.autor ?? '',
      format: x!.formato ?? 'digital',
      cover: x!.capaUrl ?? null,
    }));
}
export async function validateKnowledgeReferences(
  course: KnowledgeCourse['content'],
  courseId: string,
) {
  const ctx = await requireKnowledgeManager(),
    lessons = course.modules.flatMap((m) => m.lessons),
    ids = Array.from(
      new Set([...course.libraryItemIds, ...lessons.flatMap((l) => l.libraryItemIds)]),
    );
  if (ids.length && !hasPermission(ctx.session.authContext, 'libraryItem:read'))
    throw new KnowledgeOperationError(
      'A permissão de leitura da Biblioteca é necessária para vincular obras.',
    );
  for (const id of ids) {
    const b = await ctx.container.repositories.libraryItem.findById(id);
    if (!b || b.tenantId !== ctx.session.authContext.tenantId || b.deletedAt || !b.ativo)
      throw new KnowledgeOperationError(
        'Uma obra vinculada não está disponível na Biblioteca da Loja.',
      );
  }
  for (const l of lessons) {
    if (l.assetId) {
      const a = await ctx.repo.findAsset(l.assetId);
      if (
        !a ||
        a.tenantId !== ctx.session.authContext.tenantId ||
        a.courseId !== courseId ||
        a.deletedAt
      )
        throw new KnowledgeOperationError('Arquivo inválido para esta formação.');
      const expected = {
        video: 'video/',
        image: 'image/',
        document: 'application/pdf',
        presentation: 'application/pdf',
      }[l.kind as 'video' | 'image' | 'document' | 'presentation'];
      if (expected && !a.contentType.startsWith(expected))
        throw new KnowledgeOperationError('O tipo do arquivo não corresponde à aula.');
    }
  }
}
