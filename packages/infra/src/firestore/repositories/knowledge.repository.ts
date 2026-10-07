import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  KnowledgeOperationError,
  canReadKnowledge,
  isKnowledgeComplete,
  type KnowledgeCourse,
  type KnowledgeProgress,
  type KnowledgeAttempt,
  type KnowledgeAsset,
  type Member,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

export const knowledgeProgressId = (tenantId: string, uid: string, courseId: string) =>
  createHash('sha256')
    .update(JSON.stringify([tenantId, uid, courseId]))
    .digest('hex');
export class FirestoreKnowledgeRepository {
  constructor(private readonly db: Firestore) {}
  private courses() {
    return this.db
      .collection('knowledgeCourses')
      .withConverter(createEntityConverter<KnowledgeCourse>());
  }
  private progresses() {
    return this.db
      .collection('knowledgeProgress')
      .withConverter(createEntityConverter<KnowledgeProgress>());
  }
  async listCourses(tenantId: string) {
    const s = await this.courses()
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async findCourse(id: string) {
    const s = await this.courses().doc(id).get();
    return s.exists ? s.data()! : null;
  }
  async saveCourse(course: KnowledgeCourse, expectedVersion: number) {
    await this.db.runTransaction(async (tx) => {
      const ref = this.courses().doc(course.id),
        old = await tx.get(ref),
        before = old.data();
      if (
        (before?.version ?? 0) !== expectedVersion ||
        (before && (before.tenantId !== course.tenantId || before.deletedAt))
      )
        throw new KnowledgeOperationError(
          'Esta formação foi alterada por outro responsável. Atualize a página antes de salvar.',
        );
      tx.set(ref, course);
      const { id: _id, ...snapshot } = course;
      tx.create(this.db.collection('knowledgeVersions').doc(), {
        ...snapshot,
        courseId: course.id,
      });
      tx.create(this.db.collection('auditLogs').doc(), {
        tenantId: course.tenantId,
        entidade: 'knowledgeCourse',
        entidadeId: course.id,
        acao: before ? 'update' : 'create',
        usuarioId: course.updatedBy,
        ip: null,
        dispositivo: null,
        valorAnterior: before ? { version: before.version, status: before.content.status } : null,
        valorNovo: {
          version: course.version,
          status: course.content.status,
          changeSummary: course.content.changeSummary,
        },
        timestamp: course.updatedAt,
      });
    });
  }
  async deletionImpact(tenantId: string, courseId: string) {
    const course = await this.findCourse(courseId);
    if (!course || course.tenantId !== tenantId || course.deletedAt)
      throw new KnowledgeOperationError('Formação indisponível.');
    const participants = await this.progresses()
      .where('tenantId', '==', tenantId)
      .where('courseId', '==', courseId)
      .get();
    return { version: course.version, affected: participants.size };
  }
  async deleteCourse(
    tenantId: string,
    actorId: string,
    courseId: string,
    expectedVersion: number,
    confirmedAffected: number,
  ) {
    return this.db.runTransaction(async (tx) => {
      const ref = this.courses().doc(courseId);
      const [snapshot, participants] = await Promise.all([
        tx.get(ref),
        tx.get(
          this.progresses().where('tenantId', '==', tenantId).where('courseId', '==', courseId),
        ),
      ]);
      const course = snapshot.data();
      if (!course || course.tenantId !== tenantId || course.deletedAt)
        throw new KnowledgeOperationError('Formação indisponível.');
      if (course.version !== expectedVersion || participants.size !== confirmedAffected)
        throw new KnowledgeOperationError(
          'A formação ou seus participantes mudaram. Confira o impacto novamente antes de excluir.',
        );
      const now = new Date();
      tx.set(ref, {
        ...course,
        version: course.version + 1,
        deletedAt: now,
        ativo: false,
        updatedAt: now,
        updatedBy: actorId,
      });
      tx.create(this.db.collection('auditLogs').doc(), {
        tenantId,
        entidade: 'knowledgeCourse',
        entidadeId: courseId,
        acao: 'delete',
        usuarioId: actorId,
        ip: null,
        dispositivo: null,
        valorAnterior: { version: course.version, status: course.content.status },
        valorNovo: {
          deletedAt: now,
          affectedParticipants: participants.size,
          historyPreserved: true,
        },
        timestamp: now,
      });
      return { affected: participants.size };
    });
  }
  async listProgress(tenantId: string, uid?: string) {
    let q = this.progresses().where('tenantId', '==', tenantId);
    if (uid) q = q.where('userId', '==', uid);
    const s = await q.get();
    return s.docs.map((d) => d.data());
  }
  async mutateProgress(
    tenantId: string,
    uid: string,
    memberId: string,
    courseId: string,
    mutate: (
      course: KnowledgeCourse,
      before: KnowledgeProgress | null,
    ) => { progress: KnowledgeProgress; attempt?: KnowledgeAttempt },
  ) {
    const ref = this.progresses().doc(knowledgeProgressId(tenantId, uid, courseId));
    return this.db.runTransaction(async (tx) => {
      const [courseSnap, memberSnap, progressSnap] = await Promise.all([
        tx.get(this.courses().doc(courseId)),
        tx.get(
          this.db
            .collection('members')
            .withConverter(createEntityConverter<Member>())
            .doc(memberId),
        ),
        tx.get(ref),
      ]);
      const course = courseSnap.data(),
        member = memberSnap.data();
      if (!course || !canReadKnowledge(member ?? null, course, tenantId, uid))
        throw new KnowledgeOperationError('Conteúdo indisponível para seu cadastro ou grau.');
      const result = mutate(course, progressSnap.exists ? progressSnap.data()! : null);
      if (
        result.progress.tenantId !== tenantId ||
        result.progress.userId !== uid ||
        result.progress.courseId !== courseId
      )
        throw new KnowledgeOperationError('Progresso inválido.');
      tx.set(ref, result.progress);
      if (result.attempt) {
        tx.create(this.db.collection('knowledgeAttempts').doc(result.attempt.id), {
          ...result.attempt,
          tenantId,
          courseId,
          userId: uid,
          memberId,
          createdAt: new Date(),
        });
      }
      return result.progress;
    });
  }
  async findAsset(id: string) {
    const s = await this.db
      .collection('knowledgeAssets')
      .withConverter(createEntityConverter<KnowledgeAsset>())
      .doc(id)
      .get();
    return s.exists ? s.data()! : null;
  }
  async createAsset(asset: KnowledgeAsset) {
    const ref = this.db
      .collection('knowledgeAssets')
      .withConverter(createEntityConverter<KnowledgeAsset>())
      .doc(asset.id);
    await this.db.runTransaction(async (tx) => {
      const existing = (await tx.get(ref)).data();
      if (existing) {
        if (
          existing.tenantId !== asset.tenantId ||
          existing.courseId !== asset.courseId ||
          existing.pathname !== asset.pathname
        )
          throw new KnowledgeOperationError('Arquivo já registrado com outro vínculo.');
        return; // Callback assinado pode ser repetido pelo provedor.
      }
      tx.create(ref, asset);
    });
  }
  async listVersions(tenantId: string, courseId: string) {
    const s = await this.db
      .collection('knowledgeVersions')
      .where('tenantId', '==', tenantId)
      .where('courseId', '==', courseId)
      .orderBy('version', 'desc')
      .limit(20)
      .get();
    return s.docs.map((d) => ({
      version: d.get('version') as number,
      author: d.get('updatedBy') as string,
      status: (d.get('content') as KnowledgeCourse['content']).status,
      changes: (d.get('content') as KnowledgeCourse['content']).changeSummary,
    }));
  }
  async listPendingAttempts(tenantId: string) {
    const s = await this.db
      .collection('knowledgeAttempts')
      .where('tenantId', '==', tenantId)
      .where('pendingReview', '==', true)
      .get();
    return s.docs.map((d) => ({
      ...(d.data() as KnowledgeAttempt & {
        tenantId: string;
        courseId: string;
        userId: string;
        memberId: string;
      }),
      id: d.id,
    }));
  }
  async reviewAttempt(
    tenantId: string,
    reviewer: string,
    attemptId: string,
    score: number,
    feedback: string,
  ) {
    return this.db.runTransaction(async (tx) => {
      const attemptRef = this.db.collection('knowledgeAttempts').doc(attemptId),
        s = await tx.get(attemptRef);
      if (!s.exists || s.get('tenantId') !== tenantId || !s.get('pendingReview'))
        throw new KnowledgeOperationError('Resposta indisponível para revisão.');
      const a = s.data() as KnowledgeAttempt & { courseId: string; userId: string };
      const courseRef = this.courses().doc(a.courseId),
        pRef = this.progresses().doc(knowledgeProgressId(tenantId, a.userId, a.courseId));
      const [cSnap, pSnap] = await Promise.all([tx.get(courseRef), tx.get(pRef)]);
      const c = cSnap.data(),
        p = pSnap.data();
      if (
        !c ||
        !p ||
        c.tenantId !== tenantId ||
        a.version !== c.version ||
        p.courseVersion !== c.version
      )
        throw new KnowledgeOperationError(
          'A formação mudou. Solicite uma nova resposta para a versão atual.',
        );
      const passed = score >= c.content.assessment.minimumScore;
      tx.update(attemptRef, {
        score,
        feedback: [feedback],
        passed,
        pendingReview: false,
        reviewedBy: reviewer,
      });
      if (p.attempts.find((x) => x.lessonId === a.lessonId)?.id === a.id) {
        const updated = {
          ...p,
          attempts: p.attempts.map((x) =>
            x.id === a.id
              ? {
                  ...x,
                  score,
                  feedback: [feedback],
                  passed,
                  pendingReview: false,
                  reviewedBy: reviewer,
                }
              : x,
          ),
          completedLessonIds: passed
            ? Array.from(new Set([...p.completedLessonIds, a.lessonId]))
            : p.completedLessonIds,
          updatedAt: new Date(),
          updatedBy: reviewer,
        };
        if (isKnowledgeComplete(c, updated)) {
          updated.completedAt = updated.completedAt ?? new Date().toISOString();
          updated.certificateCode = c.content.certificate
            ? (updated.certificateCode ?? randomUUID())
            : null;
        }
        tx.set(pRef, updated);
      }
      tx.create(this.db.collection('auditLogs').doc(), {
        tenantId,
        entidade: 'knowledgeAttempt',
        entidadeId: attemptId,
        acao: 'update',
        usuarioId: reviewer,
        ip: null,
        dispositivo: null,
        valorAnterior: null,
        valorNovo: { score, passed },
        timestamp: new Date(),
      });
    });
  }
}
