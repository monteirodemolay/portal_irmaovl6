import type { KnowledgeCourseInput, KnowledgeQuestion, MemberDegree } from '@vl6/shared';
import type { BaseEntity } from '../../shared/base-entity';
import type { Member } from '../membership/entities/member.entity';

export class KnowledgeOperationError extends Error {}

export interface KnowledgeCourse extends BaseEntity {
  content: KnowledgeCourseInput;
  version: number;
  reviewerId: string | null;
  publishedAt: string | null;
}
export type KnowledgeMemberCourse = Omit<KnowledgeCourse, 'content'> & {
  content: Omit<KnowledgeCourseInput, 'modules'> & {
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<
        Omit<KnowledgeCourseInput['modules'][number]['lessons'][number], 'questions'> & {
          questions: Array<Omit<KnowledgeQuestion, 'correct' | 'expected' | 'feedback'>>;
        }
      >;
    }>;
  };
};
export interface KnowledgeAttempt {
  id: string;
  lessonId: string;
  version: number;
  submittedAt: string;
  answers: Record<string, string | number[]>;
  score: number | null;
  passed: boolean;
  pendingReview: boolean;
  feedback: string[];
  reviewedBy: string | null;
}
export interface KnowledgeProgress extends BaseEntity {
  userId: string;
  memberId: string;
  courseId: string;
  courseVersion: number;
  completedLessonIds: string[];
  lastLessonId: string | null;
  positions: Record<string, number>;
  attemptCounts: Record<string, number>;
  attempts: KnowledgeAttempt[];
  completedAt: string | null;
  certificateCode: string | null;
}
export interface KnowledgeAsset extends BaseEntity {
  courseId: string;
  pathname: string;
  contentType: string;
  filename: string;
  sizeBytes: number;
}

export const DEGREE_ORDER: Record<MemberDegree, number> = {
  aprendiz: 1,
  companheiro: 2,
  mestre: 3,
};
export function canReadKnowledge(
  member: Pick<Member, 'tenantId' | 'userId' | 'grau' | 'deletedAt' | 'ativo'> | null,
  course: KnowledgeCourse,
  tenantId: string,
  uid: string,
  now = new Date(),
): boolean {
  if (
    !member ||
    member.tenantId !== tenantId ||
    member.userId !== uid ||
    member.deletedAt ||
    !member.ativo ||
    course.tenantId !== tenantId ||
    course.deletedAt ||
    !course.ativo ||
    course.content.status !== 'publicado'
  )
    return false;
  const c = course.content;
  if ((c.startsAt && new Date(c.startsAt) > now) || (c.endsAt && new Date(c.endsAt) < now))
    return false;
  return c.audienceMode === 'selected'
    ? c.degrees.includes(member.grau)
    : DEGREE_ORDER[member.grau] >= DEGREE_ORDER[c.minimumDegree];
}
export function toKnowledgeMemberCourse(course: KnowledgeCourse): KnowledgeMemberCourse {
  return {
    ...course,
    content: {
      ...course.content,
      modules: course.content.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          questions: l.questions.map(
            ({ correct: _correct, expected: _expected, feedback: _feedback, ...q }) => q,
          ),
        })),
      })),
    },
  };
}
export function knowledgeLessons(course: Pick<KnowledgeCourse, 'content'>) {
  return course.content.modules.flatMap((m) => m.lessons);
}
export function knowledgeProgressPercent(
  course: Pick<KnowledgeCourse, 'content'>,
  progress: KnowledgeProgress | null,
): number {
  const lessons = knowledgeLessons(course);
  if (!lessons.length || !progress) return 0;
  return Math.round(
    (100 * lessons.filter((l) => progress.completedLessonIds.includes(l.id)).length) /
      lessons.length,
  );
}
const normalize = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
export function gradeKnowledge(
  questions: KnowledgeQuestion[],
  answers: Record<string, string | number[]>,
) {
  let correct = 0,
    pendingReview = false;
  const feedback: string[] = [];
  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined || (typeof a === 'string' && !a.trim()) || (Array.isArray(a) && !a.length))
      throw new KnowledgeOperationError('Responda todas as questões.');
    let pass = false;
    if (q.type === 'reflection' || q.type === 'situation') {
      if (typeof a !== 'string')
        throw new KnowledgeOperationError('Informe uma resposta em texto.');
      pendingReview = true;
    } else if (q.type === 'reading') pass = a === 'confirmed';
    else if (q.type === 'short')
      pass = typeof a === 'string' && normalize(a) === normalize(q.expected);
    else {
      if (
        !Array.isArray(a) ||
        new Set(a).size !== a.length ||
        a.some((i) => i < 0 || i >= q.options.length)
      )
        throw new KnowledgeOperationError('Alternativas inválidas.');
      const order = ['ordering', 'association'].includes(q.type);
      const left = order ? a : [...a].sort((x, y) => x - y);
      const right = order ? q.correct : [...q.correct].sort((x, y) => x - y);
      pass = left.length === right.length && left.every((v, i) => v === right[i]);
    }
    if (pass) correct++;
    feedback.push(
      q.feedback ||
        (pass
          ? 'Resposta adequada.'
          : ['reflection', 'situation'].includes(q.type)
            ? 'Resposta enviada para leitura pelo responsável.'
            : 'Revise este assunto e tente novamente.'),
    );
  }
  return {
    score: pendingReview ? null : Math.round((correct / questions.length) * 100),
    pendingReview,
    feedback,
  };
}
export function isKnowledgeComplete(course: KnowledgeCourse, progress: KnowledgeProgress): boolean {
  const lessons = knowledgeLessons(course);
  const required = lessons.filter(
    (l) => l.required || (l.kind === 'assessment' && course.content.assessment.required),
  );
  return (
    lessons.length > 0 &&
    (required.length ? required : lessons).every((l) => progress.completedLessonIds.includes(l.id))
  );
}
