'use client';
import { normalizeForSearch } from '@vl6/shared';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import type { KnowledgeCourse, KnowledgeProgress, KnowledgeAttempt } from '@vl6/domain';
import {
  knowledgeCourseSchema,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCourseInput,
  type KnowledgeLesson,
  type KnowledgeQuestion,
} from '@vl6/shared';
import { Card, PageHero, GraduationCap } from '@vl6/ui';
import {
  saveKnowledgeCourseAction,
  knowledgeDeletionImpactAction,
  deleteKnowledgeCourseAction,
  duplicateKnowledgeCourseAction,
  reviewKnowledgeAttemptAction,
  findKnowledgeUploadedAssetAction,
} from '../actions/knowledge-actions';
import './knowledge.css';
type Book = { id: string; title: string };
type Pending = KnowledgeAttempt & { courseId: string; userId: string; memberId: string };
const degreeLabels = { aprendiz: 'Aprendiz', companheiro: 'Companheiro', mestre: 'Mestre' };
const steps = [
  'Informações',
  'Módulos e aulas',
  'Atividades',
  'Avaliação',
  'Público',
  'Revisão e publicação',
];
const labels = {
  text: 'Texto',
  video: 'Vídeo',
  document: 'Documento PDF',
  image: 'Imagem',
  presentation: 'Apresentação PDF',
  link: 'Link externo',
  activity: 'Atividade',
  assessment: 'Avaliação',
};
const questionLabels = {
  choice: 'Múltipla escolha',
  boolean: 'Verdadeiro ou falso',
  multiple: 'Múltipla seleção',
  association: 'Associação',
  ordering: 'Ordenação',
  short: 'Resposta curta',
  situation: 'Estudo de situação',
  reflection: 'Reflexão',
  reading: 'Confirmação de leitura',
};
const blank = () =>
  knowledgeCourseSchema.parse({
    title: 'Nova formação',
    description: 'Descreva a proposta de formação institucional.',
    category: 'Institucional',
    responsible: 'Equipe de Instrução VL6',
  });
const blankLesson = (): KnowledgeLesson => ({
  id: crypto.randomUUID(),
  title: 'Nova aula',
  kind: 'text',
  text: '',
  assetId: null,
  url: '',
  minutes: 5,
  required: true,
  libraryItemIds: [],
  questions: [],
});
const blankQuestion = (): KnowledgeQuestion => ({
  id: crypto.randomUUID(),
  type: 'choice',
  prompt: 'Escreva o enunciado da questão.',
  options: ['Alternativa 1', 'Alternativa 2'],
  correct: [0],
  expected: '',
  feedback: '',
});
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (s: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="k-option">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function LibraryPicker({
  books,
  selected,
  onChange,
}: {
  books: Book[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  return (
    <div className="k-section">
      <h3>Leituras recomendadas · Biblioteca existente</h3>
      <input
        placeholder="Pesquisar obras da Biblioteca"
        aria-label="Pesquisar obras para vincular"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ maxHeight: 230, overflow: 'auto' }}>
        {books
          .filter((b) => normalizeForSearch(b.title).includes(normalizeForSearch(search)))
          .map((b) => (
            <Toggle
              key={b.id}
              label={b.title}
              value={selected.includes(b.id)}
              onChange={(yes) =>
                onChange(yes ? [...selected, b.id] : selected.filter((id) => id !== b.id))
              }
            />
          ))}
      </div>
      <small>
        O vínculo guarda somente o identificador do livro. Não altera o catálogo ou os empréstimos.
      </small>
    </div>
  );
}
export function KnowledgeAdmin({
  courses,
  progress,
  books,
  path,
  pending,
  members,
  versions,
  tenantId,
}: {
  tenantId: string;
  courses: KnowledgeCourse[];
  progress: KnowledgeProgress[];
  books: Book[];
  path: string[];
  pending: Pending[];
  members: Array<{ id: string; name: string }>;
  versions: Array<{ version: number; author: string; status: string; changes: string }>;
}) {
  const router = useRouter(),
    [busy, start] = useTransition(),
    [notice, setNotice] = useState(''),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('Todos');
  const editing = path[0] === 'novo' || path[0] === 'editar',
    course = courses.find((c) => c.id === path[1]);
  if (editing)
    return (
      <KnowledgeEditor
        key={course?.id ?? 'new'}
        initial={course ?? null}
        tenantId={tenantId}
        books={books}
        bank={courses.flatMap((c) =>
          c.content.modules.flatMap((m) => m.lessons.flatMap((l) => l.questions)),
        )}
        versions={versions}
      />
    );
  const review = path[0] === 'revisoes',
    reports = path[0] === 'relatorios';
  let body: React.ReactNode;
  if (review)
    body = pending.length ? (
      <div className="k-grid two">
        {pending.map((a) => (
          <Review
            key={a.id}
            attempt={a}
            name={members.find((m) => m.id === a.memberId)?.name ?? 'Irmão'}
            course={courses.find((c) => c.id === a.courseId)}
            onDone={() => router.refresh()}
          />
        ))}
      </div>
    ) : (
      <Card className="k-card">
        <h2>Nenhuma resposta aguardando revisão</h2>
        <p>Reflexões, estudos de situação e avaliações com retorno posterior aparecerão aqui.</p>
      </Card>
    );
  else if (reports) {
    const list = path[1] ? progress.filter((p) => p.userId === path[1]) : progress;
    body = (
      <>
        <div className="k-note">
          Acesso individual restrito aos responsáveis autorizados. Carga horária estimada, sem medir
          o tempo de permanência em tela.
        </div>
        <div className="k-card k-table">
          <table>
            <thead>
              <tr>
                <th>Irmão</th>
                <th>Formação</th>
                <th>Conteúdos</th>
                <th>Aproveitamento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const c = courses.find((c) => c.id === p.courseId),
                  scores = p.attempts.filter((a) => a.score !== null);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/conhecimento/relatorios/${p.userId}`}>
                        {members.find((m) => m.id === p.memberId)?.name ?? 'Cadastro indisponível'}
                      </Link>
                    </td>
                    <td>{c?.content.title ?? 'Formação arquivada'}</td>
                    <td>
                      {p.completedLessonIds.length}/
                      {c?.content.modules.flatMap((m) => m.lessons).length ?? 0}
                    </td>
                    <td>
                      {scores.length
                        ? Math.round(scores.reduce((n, a) => n + a.score!, 0) / scores.length) + '%'
                        : '—'}
                    </td>
                    <td>
                      {p.courseVersion !== c?.version
                        ? 'Versão anterior'
                        : p.completedAt
                          ? 'Concluído'
                          : 'Em andamento'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  } else {
    const published = courses.filter((c) => c.content.status === 'publicado'),
      distinct = new Set(progress.map((p) => p.userId));
    body = (
      <>
        <div className="k-grid four">
          {[
            [published.length, 'Formações publicadas'],
            [courses.length - published.length, 'Em elaboração / arquivadas'],
            [distinct.size, 'Participantes'],
            [
              progress.length
                ? Math.round(
                    (progress.filter((p) => p.completedAt).length / progress.length) * 100,
                  ) + '%'
                : '—',
              'Taxa de conclusão',
            ],
          ].map(([n, t]) => (
            <Card className="k-card k-stat" key={t}>
              <b>{n}</b>
              <p>{t}</p>
            </Card>
          ))}
        </div>
        <div className="k-row k-between k-section">
          <Link className="k-button primary" href="/admin/conhecimento/novo">
            Nova formação
          </Link>
          <label>
            Pesquisar
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Título ou responsável"
            />
          </label>
          <label>
            Situação
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {['Todos', 'rascunho', 'em_revisao', 'publicado', 'arquivado'].map((s) => (
                <option value={s} key={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="k-card k-table k-section">
          <table>
            <thead>
              <tr>
                <th>Formação</th>
                <th>Público</th>
                <th>Responsável</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {courses
                .filter(
                  (c) =>
                    (status === 'Todos' || c.content.status === status) &&
                    normalizeForSearch((c.content.title + ' ' + c.content.responsible))
                      .includes(normalizeForSearch(search)),
                )
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.content.title}
                      <br />
                      <small>Versão {c.version}</small>
                    </td>
                    <td>
                      {c.content.audienceMode === 'minimum'
                        ? `${degreeLabels[c.content.minimumDegree]} e graus superiores`
                        : c.content.degrees.map((g) => degreeLabels[g]).join(', ')}
                    </td>
                    <td>{c.content.responsible}</td>
                    <td>
                      <span className="k-tag">{c.content.status.replace('_', ' ')}</span>
                    </td>
                    <td>
                      <div className="k-row">
                        <Link className="k-button" href={`/admin/conhecimento/editar/${c.id}`}>
                          Editar
                        </Link>
                        <button
                          className="k-button"
                          disabled={busy}
                          onClick={() =>
                            start(async () => {
                              const r = await duplicateKnowledgeCourseAction(c.id);
                              if (r.ok) router.push(`/admin/conhecimento/editar/${r.value.id}`);
                              else setNotice(r.error);
                            })
                          }
                        >
                          Duplicar
                        </button>
                        <button
                          className="k-button"
                          disabled={busy}
                          onClick={() =>
                            start(async () => {
                              const r = await saveKnowledgeCourseAction(c.id, c.version, {
                                ...c.content,
                                status:
                                  c.content.status === 'publicado' ? 'em_revisao' : 'arquivado',
                                changeSummary:
                                  c.content.status === 'publicado'
                                    ? 'Despublicação para revisão.'
                                    : 'Arquivamento da formação.',
                              });
                              if (r.ok) {
                                setNotice('Situação atualizada.');
                                router.refresh();
                              } else setNotice(r.error);
                            })
                          }
                        >
                          {c.content.status === 'publicado' ? 'Despublicar' : 'Arquivar'}
                        </button>
                        <button
                          className="k-button"
                          disabled={busy}
                          onClick={() =>
                            start(async () => {
                              setNotice('Conferindo participantes…');
                              const impact = await knowledgeDeletionImpactAction(c.id);
                              if (!impact.ok) {
                                setNotice(impact.error);
                                return;
                              }
                              if (
                                impact.value.affected > 0 &&
                                !window.confirm(
                                  `Excluir “${c.content.title}”? Há ${impact.value.affected} participante(s) com atividade registrada. Eles perderão o acesso à formação, à retomada das aulas e aos certificados no Portal. O histórico será preservado para auditoria. Deseja continuar?`,
                                )
                              ) {
                                setNotice('Exclusão cancelada.');
                                return;
                              }
                              const result = await deleteKnowledgeCourseAction(
                                c.id,
                                impact.value.version,
                                impact.value.affected,
                              );
                              if (result.ok) {
                                setNotice('Formação excluída do catálogo. Histórico preservado.');
                                router.refresh();
                              } else setNotice(result.error);
                            })
                          }
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!courses.length && <p>Nenhuma formação cadastrada. Comece por “Nova formação”.</p>}
        </div>
        <div className="k-grid two k-section">
          <Card className="k-card">
            <h2>{pending.length} resposta(s) aguardando análise</h2>
            <p>Envie orientações claras e acolhedoras aos Irmãos.</p>
            <div className="k-actions">
              <Link href="/admin/conhecimento/revisoes" className="k-button">
                Revisar atividades
              </Link>
            </div>
          </Card>
          <Card className="k-card">
            <h2>Responsáveis e permissões</h2>
            <p>
              A gestão utiliza a permissão Conhecimento: gerenciar, atribuída nos papéis existentes
              do Portal.
            </p>
            <div className="k-actions">
              <Link href="/admin/pessoas/permissoes" className="k-button">
                Gerenciar papéis
              </Link>
            </div>
          </Card>
        </div>
      </>
    );
  }
  return (
    <div className="knowledge">
      <PageHero
        kicker="Administração autorizada"
        kickerIcon={<GraduationCap size={18} />}
        title={
          review
            ? 'Revisão de atividades'
            : reports
              ? 'Relatórios do Conhecimento'
              : 'Gestão do Conhecimento'
        }
        description="Organize formações, acompanhe revisões e apoie o aperfeiçoamento dos Irmãos."
      />
      <nav className="k-nav">
        <Link href="/admin/conhecimento" aria-current={!review && !reports ? 'page' : undefined}>
          Visão geral
        </Link>
        <Link href="/admin/conhecimento/novo">Nova formação</Link>
        <Link href="/admin/conhecimento/revisoes" aria-current={review ? 'page' : undefined}>
          Revisar atividades
        </Link>
        <Link href="/admin/conhecimento/relatorios" aria-current={reports ? 'page' : undefined}>
          Relatórios
        </Link>
        <Link href="/conhecimento">Área do Irmão</Link>
        {reports && <a href="/api/conhecimento/relatorio">Exportar CSV</a>}
      </nav>
      {body}
      {notice && (
        <div role="status" className="k-notice">
          {notice}
        </div>
      )}
    </div>
  );
}
function Review({
  attempt,
  name,
  course,
  onDone,
}: {
  attempt: Pending;
  name: string;
  course?: KnowledgeCourse;
  onDone: () => void;
}) {
  const [score, setScore] = useState(70),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState(''),
    [busy, start] = useTransition();
  const questions =
    course?.content.modules.flatMap((m) => m.lessons).find((l) => l.id === attempt.lessonId)
      ?.questions ?? [];
  return (
    <Card className="k-card">
      <h2>{name}</h2>
      <p>
        {course?.content.title} · Versão {attempt.version}
      </p>
      {questions.map((q) => (
        <div className="k-option" key={q.id}>
          <h3>{q.prompt}</h3>
          <p>
            {Array.isArray(attempt.answers[q.id])
              ? (attempt.answers[q.id] as number[]).map((i) => q.options[i] ?? '—').join('; ')
              : attempt.answers[q.id]}
          </p>
        </div>
      ))}
      <Field
        label="Aproveitamento (%)"
        type="number"
        value={score}
        onChange={(s) => setScore(Number(s))}
      />
      <label className="k-section">
        Orientação ao Irmão
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="k-actions">
        <button
          className="k-button primary"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await reviewKnowledgeAttemptAction(attempt.id, score, feedback);
              if (r.ok) onDone();
              else setError(r.error);
            })
          }
        >
          {busy ? 'Salvando…' : 'Registrar retorno'}
        </button>
      </div>
    </Card>
  );
}
function KnowledgeEditor({
  initial,
  books,
  bank,
  versions,
  tenantId,
}: {
  tenantId: string;
  initial: KnowledgeCourse | null;
  books: Book[];
  bank: KnowledgeQuestion[];
  versions: Array<{ version: number; author: string; status: string; changes: string }>;
}) {
  const router = useRouter(),
    [id, setId] = useState(initial?.id ?? null),
    [version, setVersion] = useState(initial?.version ?? 0),
    [draft, setDraft] = useState<KnowledgeCourseInput>(initial?.content ?? blank()),
    [step, setStep] = useState(0),
    [selectedLesson, setSelectedLesson] = useState(''),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, start] = useTransition(),
    [uploading, setUploading] = useState(false),
    [uploadPercent, setUploadPercent] = useState(0),
    [unlinked, setUnlinked] = useState<{ lessonId: string; pathname: string } | null>(null);
  const update = <K extends keyof KnowledgeCourseInput>(key: K, value: KnowledgeCourseInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const patchLesson = (lessonId: string, patch: Partial<KnowledgeLesson>) =>
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
      })),
    }));
  const patchQuestion = (lessonId: string, qid: string, patch: Partial<KnowledgeQuestion>) =>
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === lessonId
            ? { ...l, questions: l.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) }
            : l,
        ),
      })),
    }));
  const save = async (status: KnowledgeCourseInput['status'] = draft.status) => {
    setError('');
    setNotice('');
    const r = await saveKnowledgeCourseAction(id, version, { ...draft, status });
    if (r.ok) {
      setId(r.value.id);
      setVersion(r.value.version);
      update('status', status);
      setNotice(status === 'publicado' ? 'Formação publicada.' : 'Alterações salvas.');
      router.refresh();
      return r.value.id;
    }
    setError(r.error);
    return null;
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.modules.length) return;
    const a = [...draft.modules],
      m = a.splice(from, 1)[0];
    if (m) {
      a.splice(to, 0, m);
      update('modules', a);
    }
  };
  const moveLesson = (moduleId: string, from: number, to: number) =>
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m) => {
        if (m.id !== moduleId || to < 0 || to >= m.lessons.length) return m;
        const a = [...m.lessons],
          l = a.splice(from, 1)[0];
        if (l) a.splice(to, 0, l);
        return { ...m, lessons: a };
      }),
    }));
  const uploadFile = async (l: KnowledgeLesson, file: File) => {
    setError('');
    setUploading(true);
    setUploadPercent(0);
    try {
      let courseId = id;
      if (!courseId) courseId = await save('rascunho');
      if (!courseId) return;
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_'),
        prefix = `tenants/${initial?.tenantId ?? tenantId}/conhecimento/${courseId}/`;
      const result = await upload(prefix + crypto.randomUUID() + '-' + safeName, file, {
        access: 'private',
        handleUploadUrl: '/api/conhecimento/upload',
        clientPayload: JSON.stringify({ courseId }),
        onUploadProgress: (e) => setUploadPercent(e.percentage),
      });
      setUnlinked({ lessonId: l.id, pathname: result.pathname });
      const linked = await findKnowledgeUploadedAssetAction(courseId, result.pathname);
      if (linked.ok) {
        patchLesson(l.id, { assetId: linked.value.id });
        setUnlinked(null);
        setNotice('Arquivo anexado. Salve a formação para confirmar o vínculo.');
      } else setNotice(linked.error);
    } catch {
      setError('Não foi possível enviar. Confira o armazenamento privado e tente novamente.');
    } finally {
      setUploading(false);
    }
  };
  let body: React.ReactNode = null;
  if (step === 0)
    body = (
      <>
        <h2>Informações da formação</h2>
        <div className="k-fields k-section">
          <Field label="Título" value={draft.title} onChange={(s) => update('title', s)} />
          <label>
            Categoria
            <select
              value={draft.category}
              onChange={(e) =>
                update('category', e.target.value as KnowledgeCourseInput['category'])
              }
            >
              {KNOWLEDGE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Field
            label="Responsável"
            value={draft.responsible}
            onChange={(s) => update('responsible', s)}
          />
          <Field
            label="Coautores"
            value={draft.coauthors}
            onChange={(s) => update('coauthors', s)}
          />
          <Field
            label="Imagem de capa (URL HTTPS)"
            value={draft.coverUrl}
            onChange={(s) => update('coverUrl', s)}
          />
          <label>
            Nível
            <select
              value={draft.level}
              onChange={(e) => update('level', e.target.value as KnowledgeCourseInput['level'])}
            >
              {['Introdução', 'Fundamentos', 'Aperfeiçoamento'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <Field
            label="Trilha de conhecimento"
            value={draft.trail}
            onChange={(s) => update('trail', s)}
          />
          <Field
            label="Pré-requisitos"
            value={draft.prerequisites}
            onChange={(s) => update('prerequisites', s)}
          />
        </div>
        <label className="k-section">
          Descrição
          <textarea
            value={draft.description}
            maxLength={4000}
            onChange={(e) => update('description', e.target.value)}
          />
        </label>
        <label>
          Objetivo
          <textarea
            value={draft.objective}
            maxLength={2000}
            onChange={(e) => update('objective', e.target.value)}
          />
        </label>
        <Toggle
          label="Conhecimento rápido (até 10 minutos)"
          value={draft.quick}
          onChange={(b) => update('quick', b)}
        />
        <LibraryPicker
          books={books}
          selected={draft.libraryItemIds}
          onChange={(ids) => update('libraryItemIds', ids)}
        />
      </>
    );
  if (step === 1)
    body = (
      <>
        <div className="k-head">
          <h2>Módulos e aulas</h2>
          <button
            className="k-button"
            onClick={() =>
              update('modules', [
                ...draft.modules,
                {
                  id: crypto.randomUUID(),
                  title: `Módulo ${draft.modules.length + 1}`,
                  lessons: [],
                },
              ])
            }
          >
            Adicionar módulo
          </button>
        </div>
        <p>Arraste para reorganizar ou use os botões Subir e Descer.</p>
        {draft.modules.map((m, index) => (
          <div
            className="k-card k-section"
            key={m.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('module', String(index))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.getData('module'))
                move(Number(e.dataTransfer.getData('module')), index);
            }}
          >
            <div className="k-fields">
              <Field
                label="Título do módulo"
                value={m.title}
                onChange={(s) =>
                  update(
                    'modules',
                    draft.modules.map((x) => (x.id === m.id ? { ...x, title: s } : x)),
                  )
                }
              />
              <div className="k-actions">
                <button className="k-button" onClick={() => move(index, index - 1)}>
                  Subir
                </button>
                <button className="k-button" onClick={() => move(index, index + 1)}>
                  Descer
                </button>
                <button
                  className="k-button"
                  onClick={() => {
                    if (window.confirm('Remover este módulo e suas aulas do rascunho?'))
                      update(
                        'modules',
                        draft.modules.filter((x) => x.id !== m.id),
                      );
                  }}
                >
                  Remover módulo
                </button>
              </div>
            </div>
            {m.lessons.map((l, li) => (
              <div
                key={l.id}
                className="k-option"
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('lesson', JSON.stringify({ moduleId: m.id, index: li }));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const raw = e.dataTransfer.getData('lesson');
                  if (raw) {
                    const from = JSON.parse(raw);
                    if (from.moduleId === m.id) moveLesson(m.id, from.index, li);
                  }
                }}
              >
                <div className="k-head">
                  <h3>{l.title}</h3>
                  <div className="k-row">
                    <button
                      className="k-button"
                      onClick={() => setSelectedLesson(selectedLesson === l.id ? '' : l.id)}
                    >
                      Editar aula
                    </button>
                    <button className="k-button" onClick={() => moveLesson(m.id, li, li - 1)}>
                      Subir
                    </button>
                    <button className="k-button" onClick={() => moveLesson(m.id, li, li + 1)}>
                      Descer
                    </button>
                    <button
                      className="k-button"
                      onClick={() => {
                        if (window.confirm('Remover esta aula do rascunho?'))
                          update(
                            'modules',
                            draft.modules.map((x) =>
                              x.id === m.id
                                ? { ...x, lessons: x.lessons.filter((a) => a.id !== l.id) }
                                : x,
                            ),
                          );
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <small>
                  {labels[l.kind]} · {l.minutes} min {l.assetId ? '· Arquivo vinculado' : ''}
                </small>
                {selectedLesson === l.id && (
                  <div className="k-section">
                    <div className="k-fields">
                      <Field
                        label="Título"
                        value={l.title}
                        onChange={(s) => patchLesson(l.id, { title: s })}
                      />
                      <label>
                        Tipo
                        <select
                          value={l.kind}
                          onChange={(e) =>
                            patchLesson(l.id, { kind: e.target.value as KnowledgeLesson['kind'] })
                          }
                        >
                          {Object.entries(labels).map(([v, t]) => (
                            <option value={v} key={v}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label="Tempo estimado (minutos)"
                        value={l.minutes}
                        type="number"
                        onChange={(s) => patchLesson(l.id, { minutes: Number(s) })}
                      />
                    </div>
                    <Toggle
                      label="Etapa obrigatória para conclusão"
                      value={l.required}
                      onChange={(b) => patchLesson(l.id, { required: b })}
                    />
                    <label>
                      Conteúdo ou instruções
                      <textarea
                        value={l.text}
                        maxLength={40000}
                        onChange={(e) => patchLesson(l.id, { text: e.target.value })}
                      />
                    </label>
                    {l.kind === 'link' && (
                      <>
                        <Field
                          label="Link externo HTTPS"
                          value={l.url}
                          onChange={(s) => patchLesson(l.id, { url: s })}
                        />
                        <div className="k-note">
                          Links externos não recebem a proteção por grau do Portal. Use arquivos
                          privados para conteúdos restritos.
                        </div>
                      </>
                    )}
                    {['video', 'document', 'presentation', 'image'].includes(l.kind) && (
                      <label className="k-section">
                        Anexar arquivo privado (até 250 MB)
                        <input
                          type="file"
                          disabled={uploading || busy}
                          accept={
                            l.kind === 'video'
                              ? 'video/mp4,video/webm'
                              : l.kind === 'image'
                                ? 'image/jpeg,image/png,image/webp'
                                : 'application/pdf'
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadFile(l, file);
                          }}
                        />
                        {uploading && <p>Enviando… {Math.round(uploadPercent)}%</p>}
                        {l.assetId && (
                          <small>Arquivo vinculado. Será acessível por proxy autenticado.</small>
                        )}
                      </label>
                    )}
                    <LibraryPicker
                      books={books}
                      selected={l.libraryItemIds}
                      onChange={(ids) => patchLesson(l.id, { libraryItemIds: ids })}
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              className="k-button"
              onClick={() => {
                const l = blankLesson();
                update(
                  'modules',
                  draft.modules.map((x) =>
                    x.id === m.id ? { ...x, lessons: [...x.lessons, l] } : x,
                  ),
                );
                setSelectedLesson(l.id);
              }}
            >
              Adicionar aula
            </button>
          </div>
        ))}
        {!draft.modules.length && (
          <div className="k-note">Adicione o primeiro módulo para organizar as aulas.</div>
        )}
      </>
    );
  if (step === 2)
    body = (
      <>
        <h2>Editor de atividades e banco de questões</h2>
        <p>Questões das formações existentes podem ser reutilizadas e revisadas.</p>
        {draft.modules
          .flatMap((m) => m.lessons)
          .filter((l) => ['activity', 'assessment'].includes(l.kind))
          .map((l) => (
            <Card className="k-card k-section" key={l.id}>
              <div className="k-head">
                <h3>{l.title}</h3>
                <button
                  className="k-button"
                  onClick={() =>
                    patchLesson(l.id, { questions: [...l.questions, blankQuestion()] })
                  }
                >
                  Adicionar questão
                </button>
              </div>
              <label>
                Reutilizar questão
                <select
                  value=""
                  onChange={(e) => {
                    const q = bank[Number(e.target.value)];
                    if (q)
                      patchLesson(l.id, {
                        questions: [...l.questions, { ...q, id: crypto.randomUUID() }],
                      });
                  }}
                >
                  <option value="" disabled>
                    Escolha no banco
                  </option>
                  {bank.map((q, i) => (
                    <option key={q.id + i} value={i}>
                      {q.prompt.slice(0, 100)}
                    </option>
                  ))}
                </select>
              </label>
              {l.questions.map((q, qi) => (
                <div className="k-option" key={q.id}>
                  <div className="k-head">
                    <h3>Questão {qi + 1}</h3>
                    <button
                      className="k-button"
                      onClick={() =>
                        patchLesson(l.id, { questions: l.questions.filter((x) => x.id !== q.id) })
                      }
                    >
                      Remover questão
                    </button>
                  </div>
                  <label>
                    Tipo
                    <select
                      value={q.type}
                      onChange={(e) =>
                        patchQuestion(l.id, q.id, {
                          type: e.target.value as KnowledgeQuestion['type'],
                        })
                      }
                    >
                      {Object.entries(questionLabels).map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Enunciado
                    <textarea
                      value={q.prompt}
                      maxLength={4000}
                      onChange={(e) => patchQuestion(l.id, q.id, { prompt: e.target.value })}
                    />
                  </label>
                  {['choice', 'boolean', 'multiple', 'ordering', 'association'].includes(
                    q.type,
                  ) && (
                    <>
                      <label>
                        Alternativas (uma por linha)
                        {q.type === 'association' && <small> · Use termo | definição.</small>}
                        <textarea
                          value={q.options.join('\n')}
                          onChange={(e) =>
                            patchQuestion(l.id, q.id, { options: e.target.value.split('\n') })
                          }
                        />
                      </label>
                      <Field
                        label={
                          q.type === 'ordering' || q.type === 'association'
                            ? 'Sequência correta (números separados por vírgula, iniciando em 1)'
                            : 'Alternativas corretas (números separados por vírgula, iniciando em 1)'
                        }
                        value={q.correct.map((i) => i + 1).join(',')}
                        onChange={(s) =>
                          patchQuestion(l.id, q.id, {
                            correct: s
                              .split(',')
                              .filter((x) => x.trim())
                              .map((x) => Number(x.trim()) - 1),
                          })
                        }
                      />
                    </>
                  )}
                  {q.type === 'short' && (
                    <Field
                      label="Resposta esperada"
                      value={q.expected}
                      onChange={(s) => patchQuestion(l.id, q.id, { expected: s })}
                    />
                  )}
                  <label>
                    Feedback ao Irmão
                    <textarea
                      value={q.feedback}
                      maxLength={2000}
                      onChange={(e) => patchQuestion(l.id, q.id, { feedback: e.target.value })}
                    />
                  </label>
                  {['situation', 'reflection'].includes(q.type) && (
                    <small>
                      Esta resposta será avaliada pelo responsável, sem correção automática.
                    </small>
                  )}
                </div>
              ))}
            </Card>
          ))}
        {!draft.modules.some((m) =>
          m.lessons.some((l) => ['activity', 'assessment'].includes(l.kind)),
        ) && (
          <div className="k-note">
            Em Módulos e aulas, crie uma aula do tipo Atividade ou Avaliação.
          </div>
        )}
      </>
    );
  if (step === 3)
    body = (
      <>
        <h2>Configuração de avaliação</h2>
        <div className="k-fields k-section">
          <Field
            label="Nota mínima (%)"
            type="number"
            value={draft.assessment.minimumScore}
            onChange={(s) => update('assessment', { ...draft.assessment, minimumScore: Number(s) })}
          />
          <Field
            label="Tentativas por atividade"
            type="number"
            value={draft.assessment.attempts}
            onChange={(s) => update('assessment', { ...draft.assessment, attempts: Number(s) })}
          />
          <label>
            Retorno
            <select
              value={draft.assessment.feedback}
              onChange={(e) =>
                update('assessment', {
                  ...draft.assessment,
                  feedback: e.target.value as 'immediate' | 'after_review',
                })
              }
            >
              <option value="immediate">Imediato, após o envio</option>
              <option value="after_review">Após revisão do responsável</option>
            </select>
          </label>
        </div>
        <Toggle
          label="Embaralhar ordem das questões"
          value={draft.assessment.shuffle}
          onChange={(b) => update('assessment', { ...draft.assessment, shuffle: b })}
        />
        <Toggle
          label="Avaliação obrigatória para concluir a formação"
          value={draft.assessment.required}
          onChange={(b) => update('assessment', { ...draft.assessment, required: b })}
        />
        <Toggle
          label="Esta formação gera certificado institucional"
          value={draft.certificate}
          onChange={(b) => update('certificate', b)}
        />
        <div className="k-note">
          O número de questões corresponde às questões cadastradas em cada avaliação. Cada tentativa
          é registrada. Não há ranking de notas.
        </div>
      </>
    );
  if (step === 4)
    body = (
      <>
        <h2>Controle de público por grau</h2>
        <div className="k-fields k-section">
          <label>
            Regra de acesso
            <select
              value={draft.audienceMode}
              onChange={(e) => update('audienceMode', e.target.value as 'minimum' | 'selected')}
            >
              <option value="minimum">Grau mínimo e superiores</option>
              <option value="selected">Somente os graus selecionados</option>
            </select>
          </label>
          {draft.audienceMode === 'minimum' ? (
            <label>
              Grau mínimo
              <select
                value={draft.minimumDegree}
                onChange={(e) =>
                  update('minimumDegree', e.target.value as KnowledgeCourseInput['minimumDegree'])
                }
              >
                {Object.entries(degreeLabels).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div>
              {(['aprendiz', 'companheiro', 'mestre'] as const).map((g) => (
                <Toggle
                  key={g}
                  label={degreeLabels[g]}
                  value={draft.degrees.includes(g)}
                  onChange={(b) =>
                    update(
                      'degrees',
                      b ? [...draft.degrees, g] : draft.degrees.filter((x) => x !== g),
                    )
                  }
                />
              ))}
            </div>
          )}
          <Field
            label="Disponível a partir de (data/hora UTC, opcional)"
            type="datetime-local"
            value={draft.startsAt?.slice(0, 16) ?? ''}
            onChange={(s) => update('startsAt', s ? new Date(s + 'Z').toISOString() : null)}
          />
          <Field
            label="Disponível até (data/hora UTC, opcional)"
            type="datetime-local"
            value={draft.endsAt?.slice(0, 16) ?? ''}
            onChange={(s) => update('endsAt', s ? new Date(s + 'Z').toISOString() : null)}
          />
        </div>
        <div className="k-note">
          O grau é lido do cadastro do Irmão a cada acesso. Aprendiz não recebe conteúdos destinados
          a Companheiro ou Mestre. A opção “Aprendiz e superiores” atende a todos os Irmãos com
          acesso ao Portal.
        </div>
      </>
    );
  if (step === 5)
    body = (
      <>
        <h2>Revisão e publicação</h2>
        <div className="k-note">
          Revise objetivos, arquivos, referências, público e atividades. Este espaço é institucional
          e educativo; não publique palavras, sinais, toques, rituais ou cerimônias reservadas.
        </div>
        <p>
          {draft.title} · {draft.modules.length} módulos ·{' '}
          {draft.modules.flatMap((m) => m.lessons).length} aulas ·{' '}
          {draft.modules.flatMap((m) => m.lessons).reduce((n, l) => n + l.minutes, 0)} minutos
        </p>
        <label className="k-section">
          Resumo das alterações
          <textarea
            value={draft.changeSummary}
            maxLength={2000}
            onChange={(e) => update('changeSummary', e.target.value)}
          />
        </label>
        <div className="k-actions">
          <button
            className="k-button"
            disabled={busy || uploading}
            onClick={() =>
              start(async () => {
                await save('em_revisao');
              })
            }
          >
            Enviar para revisão
          </button>
          <button
            className="k-button primary"
            disabled={busy || uploading || !['em_revisao', 'publicado'].includes(draft.status)}
            onClick={() =>
              start(async () => {
                await save('publicado');
              })
            }
          >
            Publicar formação
          </button>
          <button
            className="k-button"
            disabled={busy || uploading}
            onClick={() =>
              start(async () => {
                await save('arquivado');
              })
            }
          >
            Arquivar
          </button>
        </div>
        <div className="k-section">
          <h3>Histórico de versões</h3>
          {versions.length ? (
            versions.map((v) => (
              <div className="k-option" key={v.version}>
                <span className="k-tag">
                  v{v.version} · {v.status}
                </span>
                <p>{v.changes || 'Alteração registrada'}</p>
                <small>Responsável identificado no registro de auditoria.</small>
              </div>
            ))
          ) : (
            <p>O histórico será criado no primeiro salvamento.</p>
          )}
        </div>
      </>
    );
  return (
    <div className="knowledge">
      <PageHero
        kicker="Gestão do Conhecimento"
        kickerIcon={<GraduationCap size={18} />}
        title={initial ? 'Editar formação' : 'Nova Formação'}
        description="Criação, curadoria e publicação de conteúdo institucional."
        meta={`Versão ${version} · ${draft.status.replace('_', ' ')}`}
      />
      <nav className="k-nav">
        {steps.map((s, i) => (
          <button
            key={s}
            className="k-button k-step"
            aria-pressed={i === step}
            style={i === step ? { borderColor: 'var(--k-gold)', color: 'var(--k-gold)' } : {}}
            onClick={() => setStep(i)}
          >
            {i + 1}. {s}
          </button>
        ))}
      </nav>
      <Card className="k-card">
        {body}
        <div
          className="k-row k-between k-section"
          style={{ borderTop: '1px solid var(--k-line)', paddingTop: 20 }}
        >
          <Link className="k-button" href="/admin/conhecimento">
            Voltar à gestão
          </Link>
          <button
            className="k-button"
            disabled={busy || uploading}
            onClick={() =>
              start(async () => {
                await save(draft.status === 'publicado' ? 'em_revisao' : draft.status);
              })
            }
          >
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <button className="k-button primary" onClick={() => setStep(Math.min(5, step + 1))}>
            Próxima etapa
          </button>
        </div>
      </Card>
      {unlinked && (
        <div className="k-note">
          <p>Arquivo enviado, aguardando confirmação.</p>
          <button
            className="k-button"
            onClick={() =>
              start(async () => {
                if (!id) return;
                const r = await findKnowledgeUploadedAssetAction(id, unlinked.pathname);
                if (r.ok) {
                  patchLesson(unlinked.lessonId, { assetId: r.value.id });
                  setUnlinked(null);
                  setNotice('Arquivo vinculado. Salve as alterações.');
                } else setError(r.error);
              })
            }
          >
            Confirmar vínculo
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="k-notice">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="k-notice error">
          {error}
        </div>
      )}
    </div>
  );
}
