'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  KnowledgeOperationError,
  gradeKnowledge,
  knowledgeLessons,
  type KnowledgeAttempt,
  type KnowledgeCourse,
} from '@vl6/domain';
import { knowledgeCourseSchema, knowledgeSubmissionSchema } from '@vl6/shared';
import {
  finalizeKnowledgeProgress,
  getReadableCourse,
  prepareKnowledgeProgress,
  requireKnowledgeManager,
  requireKnowledgeMember,
  validateKnowledgeReferences,
} from '../lib/server';

export type KnowledgeActionResult<T> = { ok: true; value: T } | { ok: false; error: string };
const actionError = (e: unknown) =>
  e instanceof KnowledgeOperationError
    ? e.message
    : 'Operação não autorizada ou conteúdo indisponível.';
export async function saveKnowledgeCourseAction(
  id: string | null,
  version: number,
  input: unknown,
): Promise<KnowledgeActionResult<{ id: string; version: number }>> {
  try {
    const ctx = await requireKnowledgeManager();
    const parsed = knowledgeCourseSchema.safeParse(input);
    if (!parsed.success)
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Confira os dados da formação.',
      };
    if (Buffer.byteLength(JSON.stringify(parsed.data)) > 650000)
      return {
        ok: false,
        error: 'Divida esta formação: o conteúdo ultrapassa o limite de armazenamento.',
      };
    const old = id ? await ctx.repo.findCourse(id) : null;
    if (id && (!old || old.tenantId !== ctx.session.authContext.tenantId || old.deletedAt))
      return { ok: false, error: 'Formação indisponível.' };
    const courseId = old?.id ?? randomUUID();
    await validateKnowledgeReferences(parsed.data, courseId);
    if (
      parsed.data.status === 'publicado' &&
      (!old || old.content.status === 'rascunho' || old.content.status === 'arquivado')
    )
      return { ok: false, error: 'Envie a formação para revisão antes de publicar.' };
    const now = new Date();
    const course: KnowledgeCourse = {
      id: courseId,
      tenantId: ctx.session.authContext.tenantId,
      content: parsed.data,
      version: (old?.version ?? 0) + 1,
      reviewerId:
        parsed.data.status === 'publicado'
          ? ctx.session.authContext.uid
          : (old?.reviewerId ?? null),
      publishedAt:
        parsed.data.status === 'publicado' ? now.toISOString() : (old?.publishedAt ?? null),
      createdAt: old?.createdAt ?? now,
      createdBy: old?.createdBy ?? ctx.session.authContext.uid,
      updatedAt: now,
      updatedBy: ctx.session.authContext.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await ctx.repo.saveCourse(course, version);
    revalidatePath('/conhecimento');
    revalidatePath('/admin/conhecimento');
    return { ok: true, value: { id: courseId, version: course.version } };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function knowledgeDeletionImpactAction(
  id: string,
): Promise<KnowledgeActionResult<{ version: number; affected: number }>> {
  try {
    const ctx = await requireKnowledgeManager();
    return { ok: true, value: await ctx.repo.deletionImpact(ctx.session.authContext.tenantId, id) };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function deleteKnowledgeCourseAction(
  id: string,
  version: number,
  confirmedAffected: number,
): Promise<KnowledgeActionResult<{ affected: number }>> {
  try {
    const ctx = await requireKnowledgeManager();
    if (!Number.isInteger(confirmedAffected) || confirmedAffected < 0)
      throw new KnowledgeOperationError('Confirmação de participantes inválida.');
    const value = await ctx.repo.deleteCourse(
      ctx.session.authContext.tenantId,
      ctx.session.authContext.uid,
      id,
      version,
      confirmedAffected,
    );
    revalidatePath('/conhecimento', 'layout');
    revalidatePath('/admin/conhecimento', 'layout');
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function duplicateKnowledgeCourseAction(
  id: string,
): Promise<KnowledgeActionResult<{ id: string }>> {
  try {
    const ctx = await requireKnowledgeManager(),
      old = await ctx.repo.findCourse(id);
    if (!old || old.tenantId !== ctx.session.authContext.tenantId || old.deletedAt)
      throw new KnowledgeOperationError('Formação indisponível.');
    // Arquivos privados ficam associados à formação original. A cópia exige anexos próprios;
    // referências bibliográficas continuam apontando aos mesmos livros, sem cópia do catálogo.
    const now = new Date(),
      copy: KnowledgeCourse = {
        ...old,
        id: randomUUID(),
        content: {
          ...old.content,
          title: old.content.title + ' (cópia)',
          status: 'rascunho',
          changeSummary: 'Duplicação para nova formação.',
          modules: old.content.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) => ({ ...l, assetId: null })),
          })),
        },
        version: 1,
        reviewerId: null,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.session.authContext.uid,
        updatedBy: ctx.session.authContext.uid,
      };
    await ctx.repo.saveCourse(copy, 0);
    revalidatePath('/admin/conhecimento');
    return { ok: true, value: { id: copy.id } };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function saveKnowledgePositionAction(
  courseId: string,
  lessonId: string,
  position: number,
  complete = false,
): Promise<KnowledgeActionResult<{ saved: boolean }>> {
  try {
    const ctx = await requireKnowledgeMember();
    if (!Number.isFinite(position) || position < 0 || position > 1e7)
      throw new KnowledgeOperationError('Posição inválida.');
    await ctx.repo.mutateProgress(
      ctx.session.authContext.tenantId,
      ctx.session.authContext.uid,
      ctx.member!.id,
      courseId,
      (course, before) => {
        const l = knowledgeLessons(course).find((x) => x.id === lessonId);
        if (!l) throw new KnowledgeOperationError('Aula indisponível.');
        if (complete && ['activity', 'assessment'].includes(l.kind))
          throw new KnowledgeOperationError('Envie a atividade para concluir esta etapa.');
        const p = prepareKnowledgeProgress(
          course,
          before,
          ctx.session.authContext.tenantId,
          ctx.session.authContext.uid,
          ctx.member!.id,
        );
        p.lastLessonId = lessonId;
        p.positions = { ...p.positions, [lessonId]: position };
        if (complete)
          p.completedLessonIds = Array.from(new Set([...p.completedLessonIds, lessonId]));
        return { progress: finalizeKnowledgeProgress(course, p) };
      },
    );
    if (complete) revalidatePath('/conhecimento');
    return { ok: true, value: { saved: true } };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function submitKnowledgeAnswersAction(
  input: unknown,
): Promise<KnowledgeActionResult<KnowledgeAttempt>> {
  try {
    const parsed = knowledgeSubmissionSchema.safeParse(input);
    if (!parsed.success) throw new KnowledgeOperationError('Respostas inválidas.');
    const { courseId, lessonId, version, answers } = parsed.data;
    if (Buffer.byteLength(JSON.stringify(answers)) > 100000)
      throw new KnowledgeOperationError('Respostas muito extensas.');
    const ctx = await requireKnowledgeMember();
    let attempt: KnowledgeAttempt | null = null;
    await ctx.repo.mutateProgress(
      ctx.session.authContext.tenantId,
      ctx.session.authContext.uid,
      ctx.member!.id,
      courseId,
      (course, before) => {
        if (course.version !== version)
          throw new KnowledgeOperationError(
            'A formação foi atualizada. Reabra a aula antes de responder.',
          );
        const l = knowledgeLessons(course).find((x) => x.id === lessonId);
        if (!l || !['activity', 'assessment'].includes(l.kind) || !l.questions.length)
          throw new KnowledgeOperationError('Atividade indisponível.');
        const p = prepareKnowledgeProgress(
            course,
            before,
            ctx.session.authContext.tenantId,
            ctx.session.authContext.uid,
            ctx.member!.id,
          ),
          count = p.attemptCounts[lessonId] ?? 0;
        if (p.attempts.find((a) => a.lessonId === lessonId)?.pendingReview)
          throw new KnowledgeOperationError('Sua resposta está aguardando revisão.');
        if (count >= course.content.assessment.attempts)
          throw new KnowledgeOperationError(
            'O limite de tentativas foi alcançado. Procure o responsável pela formação.',
          );
        const grade = gradeKnowledge(l.questions, answers);
        attempt = {
          id: randomUUID(),
          lessonId,
          version,
          submittedAt: new Date().toISOString(),
          answers,
          score: grade.score,
          passed: grade.score !== null && grade.score >= course.content.assessment.minimumScore,
          pendingReview:
            grade.pendingReview || course.content.assessment.feedback === 'after_review',
          feedback: course.content.assessment.feedback === 'immediate' ? grade.feedback : [],
          reviewedBy: null,
        };
        if (attempt.pendingReview) {
          attempt.score = null;
          attempt.passed = false;
        }
        p.lastLessonId = lessonId;
        p.attemptCounts = { ...p.attemptCounts, [lessonId]: count + 1 };
        p.attempts = [
          ...p.attempts.filter((a) => a.lessonId !== lessonId),
          { ...attempt, answers: {} },
        ];
        if (attempt.passed)
          p.completedLessonIds = Array.from(new Set([...p.completedLessonIds, lessonId]));
        return { progress: finalizeKnowledgeProgress(course, p), attempt };
      },
    );
    revalidatePath('/conhecimento');
    return { ok: true, value: attempt! };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function reviewKnowledgeAttemptAction(
  id: string,
  score: number,
  feedback: string,
): Promise<KnowledgeActionResult<{ saved: boolean }>> {
  try {
    const ctx = await requireKnowledgeManager();
    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100 ||
      feedback.length < 3 ||
      feedback.length > 2000
    )
      throw new KnowledgeOperationError('Informe nota entre 0 e 100 e uma orientação ao Irmão.');
    await ctx.repo.reviewAttempt(
      ctx.session.authContext.tenantId,
      ctx.session.authContext.uid,
      id,
      score,
      feedback,
    );
    revalidatePath('/conhecimento');
    revalidatePath('/admin/conhecimento');
    return { ok: true, value: { saved: true } };
  } catch (e) {
    return { ok: false, error: actionError(e) };
  }
}
export async function getKnowledgeLessonAction(courseId: string, lessonId: string) {
  const ctx = await getReadableCourse(courseId);
  const l = knowledgeLessons(ctx.course).find((x) => x.id === lessonId);
  if (!l) return null;
  return {
    id: l.id,
    title: l.title,
    kind: l.kind,
    text: l.text,
    url: l.kind === 'link' ? l.url : '',
  };
}
export async function findKnowledgeUploadedAssetAction(
  courseId: string,
  pathname: string,
): Promise<KnowledgeActionResult<{ id: string }>> {
  const ctx = await requireKnowledgeManager();
  const c = await ctx.repo.findCourse(courseId);
  if (!c || c.tenantId !== ctx.session.authContext.tenantId)
    return { ok: false, error: 'Formação indisponível.' };
  const s = await ctx.container.db
    .collection('knowledgeAssets')
    .where('tenantId', '==', c.tenantId)
    .where('courseId', '==', courseId)
    .where('pathname', '==', pathname)
    .limit(1)
    .get();
  const asset = s.docs[0];
  return asset
    ? { ok: true, value: { id: asset.id } }
    : {
        ok: false,
        error:
          'O arquivo ainda está sendo confirmado. Aguarde alguns segundos e tente vincular novamente.',
      };
}
