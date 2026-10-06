import { describe, expect, it } from 'vitest';
import { knowledgeCourseSchema } from '@vl6/shared';
import type { KnowledgeQuestion } from '@vl6/shared';
import {
  canReadKnowledge,
  gradeKnowledge,
  isKnowledgeComplete,
  toKnowledgeMemberCourse,
  type KnowledgeCourse,
  type KnowledgeProgress,
} from './knowledge';
const content = knowledgeCourseSchema.parse({
  title: 'Protocolo institucional',
  description: 'Recepção e acolhimento',
  category: 'Protocolos',
  responsible: 'Equipe de Instrução',
  minimumDegree: 'companheiro',
  modules: [
    {
      id: 'm1',
      title: 'Recepção',
      lessons: [
        { id: 'l1', title: 'Texto', kind: 'text', text: 'Conteúdo institucional', required: true },
      ],
    },
  ],
});
const course: KnowledgeCourse = {
  id: 'c1',
  tenantId: 'loja',
  content: { ...content, status: 'publicado' },
  version: 1,
  reviewerId: 'admin',
  publishedAt: '2026-10-06T00:00:00Z',
  createdBy: 'admin',
  updatedBy: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  status: 'active',
  ativo: true,
};
const member = {
  tenantId: 'loja',
  userId: 'u1',
  grau: 'companheiro' as const,
  deletedAt: null,
  ativo: true,
};
const question: KnowledgeQuestion = {
  id: 'q1',
  type: 'choice',
  prompt: 'O visitante deve ser encaminhado a quem?',
  options: ['Responsável', 'Ninguém'],
  correct: [0],
  expected: '',
  feedback: 'Acolha e encaminhe ao responsável.',
};
describe('Conhecimento — acesso por cadastro e grau', () => {
  it('não entrega instrução de Companheiro a Aprendiz, mesmo com URL conhecida', () =>
    expect(canReadKnowledge({ ...member, grau: 'aprendiz' }, course, 'loja', 'u1')).toBe(false));
  it('permite o grau mínimo e superiores', () => {
    expect(canReadKnowledge(member, course, 'loja', 'u1')).toBe(true);
    expect(canReadKnowledge({ ...member, grau: 'mestre' }, course, 'loja', 'u1')).toBe(true);
  });
  it('graus selecionados são exatos, sem superior implícito', () => {
    const c = {
      ...course,
      content: {
        ...content,
        status: 'publicado' as const,
        audienceMode: 'selected' as const,
        degrees: ['companheiro' as const],
      },
    };
    expect(canReadKnowledge(member, c, 'loja', 'u1')).toBe(true);
    expect(canReadKnowledge({ ...member, grau: 'mestre' }, c, 'loja', 'u1')).toBe(false);
  });
  it('nega outra Loja, outra conta, cadastro ausente/inativo e conteúdo não publicado', () => {
    expect(canReadKnowledge(member, course, 'outra', 'u1')).toBe(false);
    expect(canReadKnowledge(member, course, 'loja', 'outro')).toBe(false);
    expect(canReadKnowledge(null, course, 'loja', 'u1')).toBe(false);
    expect(canReadKnowledge({ ...member, ativo: false }, course, 'loja', 'u1')).toBe(false);
    expect(
      canReadKnowledge(
        member,
        { ...course, content: { ...content, status: 'rascunho' } },
        'loja',
        'u1',
      ),
    ).toBe(false);
  });
  it('respeita agendamento e encerramento', () => {
    const now = new Date('2026-10-06');
    expect(
      canReadKnowledge(
        member,
        { ...course, content: { ...course.content, startsAt: '2026-10-07T00:00:00Z' } },
        'loja',
        'u1',
        now,
      ),
    ).toBe(false);
    expect(
      canReadKnowledge(
        member,
        { ...course, content: { ...course.content, endsAt: '2026-10-05T00:00:00Z' } },
        'loja',
        'u1',
        now,
      ),
    ).toBe(false);
  });
  it('DTO do Irmão não contém gabarito, resposta esperada ou feedback prévio', () => {
    const c = {
      ...course,
      content: {
        ...content,
        modules: [
          {
            id: 'm1',
            title: 'Atividade',
            lessons: [{ ...content.modules[0]!.lessons[0]!, questions: [question] }],
          },
        ],
      },
    };
    const q = toKnowledgeMemberCourse(c).content.modules[0]!.lessons[0]!.questions[0]!;
    expect(q).not.toHaveProperty('correct');
    expect(q).not.toHaveProperty('expected');
    expect(q).not.toHaveProperty('feedback');
  });
});
describe('Avaliação no servidor', () => {
  it('calcula a nota sem aceitar nota enviada pelo cliente', () => {
    expect(gradeKnowledge([question], { q1: [0] }).score).toBe(100);
    expect(gradeKnowledge([question], { q1: [1] }).score).toBe(0);
  });
  it('múltipla seleção exige o conjunto exato, sem duplicatas', () => {
    const q = { ...question, type: 'multiple' as const, options: ['A', 'B', 'C'], correct: [0, 2] };
    expect(gradeKnowledge([q], { q1: [2, 0] }).score).toBe(100);
    expect(gradeKnowledge([q], { q1: [0, 1, 2] }).score).toBe(0);
    expect(() => gradeKnowledge([q], { q1: [0, 0, 2] })).toThrow();
  });
  it('ordenação e associação respeitam posições', () => {
    const q = { ...question, type: 'ordering' as const, correct: [1, 0] };
    expect(gradeKnowledge([q], { q1: [1, 0] }).score).toBe(100);
    expect(gradeKnowledge([q], { q1: [0, 1] }).score).toBe(0);
  });
  it('respostas curtas normalizam acentos e capitalização', () =>
    expect(
      gradeKnowledge([{ ...question, type: 'short', expected: 'Fraternidade' }], {
        q1: ' FRATERNIDADE ',
      }).score,
    ).toBe(100));
  it('reflexão e situação nunca recebem aprovação automática', () => {
    const r = gradeKnowledge([{ ...question, type: 'reflection' }], { q1: 'Minha reflexão' });
    expect(r.pendingReview).toBe(true);
    expect(r.score).toBeNull();
  });
  it('nega resposta ausente e índice forjado', () => {
    expect(() => gradeKnowledge([question], {})).toThrow();
    expect(() => gradeKnowledge([question], { q1: [99] })).toThrow();
  });
  it('não conclui formação com aula obrigatória pendente', () => {
    const p = { completedLessonIds: [] } as unknown as KnowledgeProgress;
    expect(isKnowledgeComplete(course, p)).toBe(false);
    expect(isKnowledgeComplete(course, { ...p, completedLessonIds: ['l1'] })).toBe(true);
  });
});
describe('Conclusão com conteúdo opcional', () => {
  it('não emite conclusão apenas por abrir a aula quando todas são opcionais', () => {
    const optional = {
      ...course,
      content: {
        ...course.content,
        modules: course.content.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => ({ ...l, required: false })),
        })),
      },
    };
    expect(
      isKnowledgeComplete(optional, { completedLessonIds: [] } as unknown as KnowledgeProgress),
    ).toBe(false);
    expect(
      isKnowledgeComplete(optional, { completedLessonIds: ['l1'] } as unknown as KnowledgeProgress),
    ).toBe(true);
  });
});
describe('Validação administrativa', () => {
  it('bloqueia publicação vazia, vídeo sem arquivo e gabarito inválido', () => {
    expect(
      knowledgeCourseSchema.safeParse({ ...content, status: 'publicado', modules: [] }).success,
    ).toBe(false);
    expect(
      knowledgeCourseSchema.safeParse({
        ...content,
        status: 'publicado',
        modules: [
          { id: 'm', title: 'Vídeo', lessons: [{ id: 'l', title: 'Vídeo', kind: 'video' }] },
        ],
      }).success,
    ).toBe(false);
    expect(
      knowledgeCourseSchema.safeParse({
        ...content,
        modules: [
          {
            id: 'm',
            title: 'Atividade',
            lessons: [
              {
                id: 'l',
                title: 'Questão',
                kind: 'activity',
                questions: [{ ...question, correct: [9] }],
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('nega identificadores repetidos e links javascript', () => {
    const l = content.modules[0]!.lessons[0]!;
    expect(
      knowledgeCourseSchema.safeParse({
        ...content,
        modules: [{ id: 'm', title: 'Módulo', lessons: [l, l] }],
      }).success,
    ).toBe(false);
    expect(
      knowledgeCourseSchema.safeParse({ ...content, coverUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });
  it('exige avaliação obrigatória quando ativada', () =>
    expect(
      knowledgeCourseSchema.safeParse({
        ...content,
        status: 'publicado',
        assessment: { ...content.assessment, required: true },
      }).success,
    ).toBe(false));
});
