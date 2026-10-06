import { z } from 'zod';
import { MEMBER_DEGREES } from '../enums/membership';

export const KNOWLEDGE_CATEGORIES = [
  'História',
  'Institucional',
  'Protocolos',
  'Administração',
  'Cultura Maçônica',
  'Liderança',
  'Convivência',
  'Documentos',
  'Outros',
] as const;
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const knowledgeQuestionSchema = z
  .object({
    id,
    type: z.enum([
      'choice',
      'boolean',
      'multiple',
      'association',
      'ordering',
      'short',
      'situation',
      'reflection',
      'reading',
    ]),
    prompt: z.string().trim().min(5).max(4000),
    options: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
    // Associação: opções "termo | definição", e respostas são os índices correspondentes.
    correct: z.array(z.number().int().min(0).max(11)).max(12).default([]),
    expected: z.string().max(2000).default(''),
    feedback: z.string().max(2000).default(''),
  })
  .superRefine((q, ctx) => {
    if (['choice', 'boolean', 'multiple', 'association', 'ordering'].includes(q.type)) {
      if (
        q.options.length < 2 ||
        q.correct.length === 0 ||
        q.correct.some((i) => i >= q.options.length) ||
        new Set(q.correct).size !== q.correct.length
      )
        ctx.addIssue({ code: 'custom', message: 'Preencha alternativas e gabarito válidos.' });
      if (['choice', 'boolean'].includes(q.type) && q.correct.length !== 1)
        ctx.addIssue({ code: 'custom', message: 'Informe uma única resposta correta.' });
      if (['association', 'ordering'].includes(q.type) && q.correct.length !== q.options.length)
        ctx.addIssue({ code: 'custom', message: 'Preencha toda a sequência do gabarito.' });
      if (q.type === 'association' && q.options.some((o) => !o.includes('|')))
        ctx.addIssue({
          code: 'custom',
          message: 'Associação: escreva termo | definição em cada opção.',
        });
    }
    if (q.type === 'short' && !q.expected.trim())
      ctx.addIssue({ code: 'custom', message: 'Informe a resposta curta esperada.' });
  });
export const knowledgeLessonSchema = z.object({
  id,
  title: z.string().trim().min(2).max(180),
  kind: z.enum([
    'text',
    'video',
    'document',
    'image',
    'presentation',
    'link',
    'activity',
    'assessment',
  ]),
  text: z.string().max(40000).default(''),
  // Nenhuma URL de mídia privada no DTO do Irmão. O proxy resolve pelo assetId.
  assetId: id.nullable().default(null),
  url: z
    .string()
    .max(2000)
    .refine((s) => !s || /^https:\/\//.test(s), 'Use um link HTTPS.')
    .default(''),
  minutes: z.number().int().min(1).max(600).default(5),
  libraryItemIds: z.array(id).max(20).default([]),
  required: z.boolean().default(true),
  questions: z.array(knowledgeQuestionSchema).max(50).default([]),
});
export const knowledgeCourseSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().min(5).max(4000),
    objective: z.string().max(2000).default(''),
    category: z.enum(KNOWLEDGE_CATEGORIES),
    responsible: z.string().trim().min(3).max(180),
    coauthors: z.string().max(500).default(''),
    coverUrl: z
      .string()
      .max(2000)
      .refine((s) => !s || /^https:\/\//.test(s), 'Use uma capa HTTPS.')
      .default(''),
    level: z.enum(['Introdução', 'Fundamentos', 'Aperfeiçoamento']).default('Introdução'),
    trail: z.string().max(180).default(''),
    prerequisites: z.string().max(1000).default(''),
    minimumDegree: z.enum(MEMBER_DEGREES).default('aprendiz'),
    audienceMode: z.enum(['minimum', 'selected']).default('minimum'),
    degrees: z.array(z.enum(MEMBER_DEGREES)).min(1).default(['aprendiz', 'companheiro', 'mestre']),
    quick: z.boolean().default(false),
    status: z.enum(['rascunho', 'em_revisao', 'publicado', 'arquivado']).default('rascunho'),
    startsAt: z.string().datetime().nullable().default(null),
    endsAt: z.string().datetime().nullable().default(null),
    libraryItemIds: z.array(id).max(30).default([]),
    modules: z
      .array(
        z.object({
          id,
          title: z.string().trim().min(2).max(180),
          lessons: z.array(knowledgeLessonSchema).max(50),
        }),
      )
      .max(20)
      .default([]),
    assessment: z
      .object({
        minimumScore: z.number().int().min(0).max(100).default(70),
        attempts: z.number().int().min(1).max(20).default(3),
        shuffle: z.boolean().default(true),
        feedback: z.enum(['immediate', 'after_review']).default('immediate'),
        required: z.boolean().default(false),
      })
      .default({}),
    certificate: z.boolean().default(false),
    changeSummary: z.string().trim().max(2000).default(''),
  })
  .superRefine((c, ctx) => {
    const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length > 200)
      ctx.addIssue({ code: 'custom', message: 'Divida a formação em até 200 aulas por percurso.' });
    if (
      new Set(lessonIds).size !== lessonIds.length ||
      new Set(c.modules.map((m) => m.id)).size !== c.modules.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Módulos e aulas devem ter identificadores únicos.',
      });
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt)
      ctx.addIssue({ code: 'custom', message: 'A data final deve ser posterior à inicial.' });
    for (const l of c.modules.flatMap((m) => m.lessons)) {
      if (new Set(l.questions.map((q) => q.id)).size !== l.questions.length)
        ctx.addIssue({
          code: 'custom',
          message: 'Questões devem ter identificadores únicos na aula.',
        });
      if (c.status === 'publicado') {
        if (['activity', 'assessment'].includes(l.kind) && !l.questions.length)
          ctx.addIssue({
            code: 'custom',
            message: 'Atividades e avaliações precisam de questões.',
          });
        if (['video', 'document', 'image', 'presentation'].includes(l.kind) && !l.assetId)
          ctx.addIssue({ code: 'custom', message: 'Anexe o arquivo da aula antes da publicação.' });
        if (l.kind === 'text' && !l.text.trim())
          ctx.addIssue({ code: 'custom', message: 'A aula em texto precisa de conteúdo.' });
        if (l.kind === 'link' && !l.url)
          ctx.addIssue({ code: 'custom', message: 'Informe o link da aula.' });
      }
    }
    if (c.status === 'publicado' && (!lessonIds.length || c.modules.some((m) => !m.lessons.length)))
      ctx.addIssue({ code: 'custom', message: 'Inclua ao menos uma aula em cada módulo.' });
    if (
      c.status === 'publicado' &&
      c.assessment.required &&
      !c.modules.some((m) => m.lessons.some((l) => l.kind === 'assessment' && l.required))
    )
      ctx.addIssue({ code: 'custom', message: 'Inclua uma avaliação obrigatória.' });
    if (c.quick && c.modules.flatMap((m) => m.lessons).reduce((n, l) => n + l.minutes, 0) > 10)
      ctx.addIssue({ code: 'custom', message: 'Conhecimento rápido deve durar até 10 minutos.' });
  });
export type KnowledgeCourseInput = z.infer<typeof knowledgeCourseSchema>;
export type KnowledgeLesson = z.infer<typeof knowledgeLessonSchema>;
export type KnowledgeQuestion = z.infer<typeof knowledgeQuestionSchema>;
export const knowledgeSubmissionSchema = z.object({
  courseId: id,
  lessonId: id,
  version: z.number().int().positive(),
  answers: z.record(
    id,
    z.union([z.string().max(4000), z.array(z.number().int().min(0).max(11)).max(12)]),
  ),
});
