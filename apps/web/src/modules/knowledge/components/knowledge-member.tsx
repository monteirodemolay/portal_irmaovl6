'use client';
import { normalizeForSearch } from '@vl6/shared';

import { useState, useTransition, useEffect, useRef } from 'react';
import Link from '@/components/layout/context-link';
import { useRouter } from 'next/navigation';
import type { KnowledgeMemberCourse, KnowledgeProgress } from '@vl6/domain';
import { KNOWLEDGE_CATEGORIES } from '@vl6/shared';
import { BookOpen, Card, PageHero, GraduationCap, PdfViewer } from '@vl6/ui';
import {
  saveKnowledgePositionAction,
  submitKnowledgeAnswersAction,
} from '../actions/knowledge-actions';
import './knowledge.css';

type Course = KnowledgeMemberCourse;
type Lesson = Course['content']['modules'][number]['lessons'][number];
type Reference = {
  id: string;
  title: string;
  author: string;
  format: string;
  cover: string | null;
};
const lessons = (c: Course) => c.content.modules.flatMap((m) => m.lessons);
const percent = (c: Course, p?: KnowledgeProgress) =>
  Math.round(
    (100 *
      (p?.completedLessonIds.filter((id) => lessons(c).some((l) => l.id === id)).length ?? 0)) /
      Math.max(1, lessons(c).length),
  );
const courseHref = (c: Course) => `/conhecimento/formacao/${c.id}`;
const lessonHref = (c: Course, l: string) => `/conhecimento/aula/${c.id}/${l}`;
const progressHref = (c: Course, p?: KnowledgeProgress) =>
  lessonHref(c, p?.lastLessonId ?? lessons(c)[0]?.id ?? '');
function Bar({ n }: { n: number }) {
  return (
    <div
      className="k-bar"
      role="progressbar"
      aria-valuenow={n}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso"
    >
      <span style={{ width: `${n}%` }} />
    </div>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="k-empty">
      <BookOpen size={32} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
function Stats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="k-grid four">
      {items.map(([v, l]) => (
        <Card className="k-card k-stat" key={l}>
          <b>{v}</b>
          <p>{l}</p>
        </Card>
      ))}
    </div>
  );
}
function CourseCards({ courses, progress }: { courses: Course[]; progress: KnowledgeProgress[] }) {
  return courses.length ? (
    <div className="k-grid">
      {courses.map((c) => {
        const p = progress.find((x) => x.courseId === c.id),
          n = percent(c, p);
        return (
          <Card className="k-card" key={c.id}>
            <div className="k-cover">
              {c.content.coverUrl ? (
                <img src={c.content.coverUrl} alt="" />
              ) : (
                <BookOpen size={45} />
              )}
            </div>
            <div className="k-row k-between">
              <span className={`k-tag ${n === 100 ? 'done' : ''}`}>
                {p?.completedAt ? 'Concluído' : n ? 'Em andamento' : 'Não iniciado'}
              </span>
              <small>{c.content.category}</small>
            </div>
            <h3 className="k-section">{c.content.title}</h3>
            <p>{c.content.responsible}</p>
            <small>
              {lessons(c).reduce((n, l) => n + l.minutes, 0)} min · {c.content.modules.length}{' '}
              módulos
            </small>
            <Bar n={n} />
            <div className="k-row k-between">
              <small>{n}% concluído</small>
              <Link className="k-button" href={n ? progressHref(c, p) : courseHref(c)}>
                {n ? 'Continuar' : 'Conhecer'}
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  ) : (
    <Empty
      title="Nenhuma formação disponível"
      description="As instruções publicadas para seu grau aparecerão aqui."
    />
  );
}
function References({ ids, books }: { ids: string[]; books: Reference[] }) {
  const refs = books.filter((b) => ids.includes(b.id));
  return refs.length ? (
    <section className="k-section">
      <div className="k-head">
        <h2>Para aprofundar seus conhecimentos</h2>
      </div>
      <div className="k-grid two">
        {refs.map((b) => (
          <Card key={b.id} className="k-card">
            <div className="k-book">
              {b.cover ? <img src={b.cover} alt={`Capa de ${b.title}`} /> : <BookOpen size={30} />}
              <div>
                <span className="k-tag">
                  Biblioteca VL6 ·{' '}
                  {b.format === 'digital'
                    ? 'Digital'
                    : b.format === 'fisico_digital'
                      ? 'Físico + digital'
                      : 'Físico'}
                </span>
                <h3>{b.title}</h3>
                <p>{b.author}</p>
              </div>
            </div>
            <div className="k-actions">
              <Link className="k-button" href={`/acervo/biblioteca/${b.id}`}>
                Ver na Biblioteca
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  ) : null;
}
export function KnowledgeMember({
  data,
  path,
  books,
}: {
  data: {
    courses: Course[];
    progress: KnowledgeProgress[];
    name: string;
    degree: string;
    canManage: boolean;
  };
  path: string[];
  books: Reference[];
}) {
  const { courses, name, degree, canManage } = data;
  const [progress, setProgress] = useState(data.progress),
    [category, setCategory] = useState('Todos'),
    [search, setSearch] = useState(''),
    [notice, setNotice] = useState('');
  const view = path[0] ?? '',
    course = courses.find((c) => c.id === path[1]);
  const p = course ? progress.find((p) => p.courseId === course.id) : undefined,
    lesson = course ? lessons(course).find((l) => l.id === path[2]) : undefined;
  useEffect(() => setProgress(data.progress), [data.progress]);
  const started = courses.filter((c) => progress.some((p) => p.courseId === c.id)),
    completed = progress.filter((p) => p.completedAt),
    recent = [...progress].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0],
    last = courses.find((c) => c.id === recent?.courseId),
    pending = courses.flatMap((c) =>
      lessons(c)
        .filter(
          (l) =>
            ['activity', 'assessment'].includes(l.kind) &&
            !progress.find((p) => p.courseId === c.id)?.completedLessonIds.includes(l.id),
        )
        .map((l) => ({ c, l })),
    );
  let content: React.ReactNode = null,
    title = 'Conhecimento VL6',
    description = 'Formação, conhecimento e aperfeiçoamento ao longo da jornada.';
  if (!view) {
    content = (
      <>
        <Card className="k-card">
          <div className="k-head">
            <div>
              <h2>Boa noite, Irmão {name.split(' ')[0]}.</h2>
              <p>
                {last ? `Retome: ${last.content.title}` : 'Seu próximo aprendizado começa aqui.'}
              </p>
            </div>
            {last ? (
              <Link className="k-button primary" href={progressHref(last, recent)}>
                Continuar aprendendo
              </Link>
            ) : (
              <Link className="k-button primary" href="/conhecimento/formacoes">
                Explorar formações
              </Link>
            )}
          </div>
          <Stats
            items={[
              [String(started.length), 'Formações iniciadas'],
              [String(completed.length), 'Formações concluídas'],
              [String(pending.length), 'Atividades pendentes'],
              [last ? percent(last, recent) + '%' : '0%', 'Última formação'],
            ]}
          />
        </Card>
        <section className="k-section">
          <div className="k-head">
            <h2>Recomendado para você</h2>
            <Link className="k-button" href="/conhecimento/formacoes">
              Todas as formações
            </Link>
          </div>
          <CourseCards
            courses={courses
              .filter(
                (c) => !c.content.quick && !progress.find((p) => p.courseId === c.id)?.completedAt,
              )
              .slice(0, 3)}
            progress={progress}
          />
        </section>
        <section className="k-section">
          <div className="k-head">
            <h2>Sua jornada, no seu ritmo</h2>
          </div>
          <Card className="k-card">
            <div className="k-row k-between">
              <div>
                <h3>Estudos adequados ao seu grau</h3>
                <p>Livros e formações para aprofundar sua vida em Loja.</p>
              </div>
              <Link className="k-button" href="/conhecimento/minha-jornada">
                Minha Jornada
              </Link>
            </div>
          </Card>
        </section>
        <section className="k-section">
          <div className="k-head">
            <h2>Em poucos minutos</h2>
          </div>
          <CourseCards
            courses={courses.filter((c) => c.content.quick).slice(0, 3)}
            progress={progress}
          />
        </section>
      </>
    );
  }
  if (view === 'formacoes' || view === 'rapido') {
    title = view === 'rapido' ? 'Em poucos minutos' : 'Formações';
    description =
      view === 'rapido'
        ? 'Conteúdos de até 10 minutos para o dia a dia.'
        : 'Escolha um tema e avance no seu ritmo.';
    const filtered = courses.filter(
      (c) =>
        (view !== 'rapido' || c.content.quick) &&
        (category === 'Todos' || c.content.category === category) &&
        normalizeForSearch((c.content.title + ' ' + c.content.description + ' ' + c.content.responsible))
          .includes(normalizeForSearch(search)),
    );
    content = (
      <>
        <label>
          Pesquisar formações
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Título, tema ou responsável"
          />
        </label>
        <div className="k-nav">
          {['Todos', ...KNOWLEDGE_CATEGORIES].map((t) => (
            <button
              key={t}
              className="k-button"
              aria-pressed={category === t}
              style={category === t ? { borderColor: 'var(--k-gold)', color: 'var(--k-gold)' } : {}}
              onClick={() => setCategory(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <CourseCards courses={filtered} progress={progress} />
      </>
    );
  }
  if (view === 'minha-jornada') {
    title = 'Minha Jornada';
    description = 'Um percurso formativo que acompanha sua vida em Loja.';
    const groups = Array.from(new Set(courses.map((c) => c.content.trail || c.content.level)));
    content = groups.length ? (
      <div className="k-timeline">
        {groups.map((t) => {
          const list = courses.filter((c) => (c.content.trail || c.content.level) === t);
          return (
            <Card key={t} className="k-card">
              <span className="k-tag">Sua trilha</span>
              <h2>{t}</h2>
              <p>
                {list.length} formação(ões) ·{' '}
                {
                  list.filter((c) => progress.some((p) => p.courseId === c.id && p.completedAt))
                    .length
                }{' '}
                concluída(s)
              </p>
              <div className="k-section">
                <CourseCards courses={list} progress={progress} />
              </div>
            </Card>
          );
        })}
      </div>
    ) : (
      <Empty
        title="Sua jornada está sendo preparada"
        description="As trilhas publicadas para seu grau serão apresentadas aqui."
      />
    );
  }
  if (view === 'progresso') {
    title = 'Meu Progresso';
    description = 'Seu aprendizado é pessoal. Cada etapa tem seu próprio ritmo.';
    const doneMinutes = courses.reduce(
        (n, c) =>
          n +
          lessons(c)
            .filter((l) =>
              progress.find((p) => p.courseId === c.id)?.completedLessonIds.includes(l.id),
            )
            .reduce((n, l) => n + l.minutes, 0),
        0,
      ),
      scores = progress.flatMap((p) =>
        p.attempts.filter((a) => a.score !== null).map((a) => a.score!),
      );
    content = (
      <>
        <Stats
          items={[
            [`${Math.floor(doneMinutes / 60)}h ${doneMinutes % 60}min`, 'Carga estimada concluída'],
            [String(completed.length), 'Formações concluídas'],
            [String(started.length - completed.length), 'Em andamento'],
            [
              scores.length
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%'
                : '—',
              'Aproveitamento médio',
            ],
          ]}
        />
        <div className="k-grid two k-section">
          <Card className="k-card">
            <h2>Continuidade dos estudos</h2>
            <div className="k-chart">
              {started.slice(0, 6).map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    height:
                      Math.max(
                        3,
                        percent(
                          c,
                          progress.find((p) => p.courseId === c.id),
                        ),
                      ) * 1.3,
                  }}
                  title={c.content.title}
                >
                  <span>{i + 1}</span>
                </div>
              ))}
            </div>
            <p>Progresso das formações iniciadas. Os números correspondem à ordem do histórico.</p>
          </Card>
          <Card className="k-card">
            <h2>Histórico</h2>
            {started.map((c, i) => (
              <div className="k-section" key={c.id}>
                <Link href={courseHref(c)}>
                  {i + 1}. {c.content.title}
                </Link>
                <Bar
                  n={percent(
                    c,
                    progress.find((p) => p.courseId === c.id),
                  )}
                />
                <small>
                  {percent(
                    c,
                    progress.find((p) => p.courseId === c.id),
                  )}
                  % dos conteúdos ·{' '}
                  {progress.find((p) => p.courseId === c.id)?.completedAt
                    ? 'Concluído'
                    : 'Em andamento'}
                </small>
                {progress.find((p) => p.courseId === c.id)?.certificateCode && (
                  <div>
                    <Link className="k-button" href={`/conhecimento/certificado/${c.id}`}>
                      Ver certificado
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
        <div className="k-note">
          Seu progresso e suas respostas são acessíveis a você e aos responsáveis autorizados. Não
          há rankings ou comparação pública.
        </div>
      </>
    );
  }
  if (view === 'atividades') {
    title = 'Atividades';
    description = 'Aplique o que aprendeu e acompanhe os retornos dos responsáveis.';
    content = pending.length ? (
      <div className="k-grid">
        {pending.map(({ c, l }) => (
          <Card className="k-card" key={c.id + l.id}>
            <span className="k-tag">{l.kind === 'assessment' ? 'Avaliação' : 'Atividade'}</span>
            <h3>{l.title}</h3>
            <p>{c.content.title}</p>
            <div className="k-actions">
              <Link className="k-button" href={lessonHref(c, l.id)}>
                Abrir atividade
              </Link>
            </div>
          </Card>
        ))}
      </div>
    ) : (
      <Empty
        title="Nenhuma atividade pendente"
        description="Novas atividades aparecerão conforme suas formações disponíveis."
      />
    );
  }
  if (view === 'formacao' && course) {
    title = course.content.title;
    description = course.content.description;
    content = (
      <>
        <div className="k-grid two">
          <Card className="k-card">
            <span className="k-tag">{course.content.category}</span>
            <h2 className="k-section">
              {course.content.objective || 'Aperfeiçoamento institucional'}
            </h2>
            <p>{course.content.responsible}</p>
            <p>
              {lessons(course).reduce((n, l) => n + l.minutes, 0)} min ·{' '}
              {course.content.modules.length} módulos · {course.content.level}
            </p>
            {course.content.prerequisites && <p>Pré-requisitos: {course.content.prerequisites}</p>}
            <Bar n={percent(course, p)} />
            <div className="k-actions">
              <Link className="k-button primary" href={progressHref(course, p)}>
                {p ? 'Continuar formação' : 'Iniciar formação'}
              </Link>
            </div>
          </Card>
          <Card className="k-card">
            <h2>Conteúdo da formação</h2>
            {course.content.modules.map((m) => (
              <div className="k-option" key={m.id}>
                <h3>{m.title}</h3>
                {m.lessons.map((l) => (
                  <div key={l.id}>
                    <Link href={lessonHref(course, l.id)}>
                      {p?.completedLessonIds.includes(l.id) ? '✓ ' : ''}
                      {l.title}
                    </Link>
                    <small> · {l.minutes} min</small>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>
        <References ids={course.content.libraryItemIds} books={books} />
      </>
    );
  }
  if (view === 'aula' && course && lesson) {
    title = course.content.title;
    description = lesson.title;
    content = (
      <div className="k-split">
        <Card className="k-card k-lessons">
          <details open>
            <summary>Conteúdo da formação</summary>
            <Bar n={percent(course, p)} />
            {course.content.modules.map((m) => (
              <section key={m.id} className="k-section">
                <h3>{m.title}</h3>
                {m.lessons.map((l) => (
                  <Link
                    key={l.id}
                    aria-current={l.id === lesson.id ? 'page' : undefined}
                    href={lessonHref(course, l.id)}
                  >
                    {p?.completedLessonIds.includes(l.id) ? '✓ ' : ''}
                    {l.title}
                  </Link>
                ))}
              </section>
            ))}
          </details>
        </Card>
        <div>
          <LessonView
            key={course.id + lesson.id}
            course={course}
            lesson={lesson}
            progress={p}
            onNotice={setNotice}
            onDone={() => {
              setProgress((old) =>
                old.map((x) =>
                  x.courseId === course.id
                    ? {
                        ...x,
                        completedLessonIds: Array.from(
                          new Set([...x.completedLessonIds, lesson.id]),
                        ),
                      }
                    : x,
                ),
              );
            }}
          />
          <References
            ids={Array.from(new Set([...course.content.libraryItemIds, ...lesson.libraryItemIds]))}
            books={books}
          />
        </div>
      </div>
    );
  }
  if (view === 'resultado' && course) {
    title = 'Resultado';
    const a = p?.attempts.find((a) => a.lessonId === path[2]);
    description = a?.pendingReview
      ? 'Sua resposta está aguardando leitura pelo responsável.'
      : a?.passed
        ? 'Você concluiu esta etapa de sua jornada.'
        : 'Alguns conteúdos merecem uma nova leitura.';
    content = a ? (
      <>
        <Stats
          items={[
            [a.score === null ? 'Em revisão' : `${a.score}%`, 'Aproveitamento'],
            [percent(course, p) + '%', 'Conteúdos'],
            [a.passed ? 'Concluída' : 'A revisar', 'Atividade'],
            [String(p?.attemptCounts[a.lessonId] ?? 1), 'Tentativas utilizadas'],
          ]}
        />
        <Card className="k-card k-section">
          <h2>
            {a.pendingReview
              ? 'Aguardando revisão'
              : a.passed
                ? 'Aprendizado incorporado'
                : 'Revisite o conteúdo'}
          </h2>
          {a.feedback.map((f, i) => (
            <p key={i}>{f}</p>
          ))}
          <div className="k-actions">
            <Link className="k-button" href={lessonHref(course, a.lessonId)}>
              Revisitar atividade
            </Link>
            <Link className="k-button" href={courseHref(course)}>
              Voltar à formação
            </Link>
            {p?.certificateCode && (
              <Link className="k-button primary" href={`/conhecimento/certificado/${course.id}`}>
                Ver certificado
              </Link>
            )}
          </div>
        </Card>
      </>
    ) : (
      <Empty
        title="Nenhum resultado disponível"
        description="Conclua a atividade para consultar seu retorno."
      />
    );
  }
  if (view === 'certificado' && course) {
    title = 'Certificado institucional';
    description = course.content.title;
    content =
      p?.certificateCode && p.completedAt ? (
        <>
          <div className="k-certificate">
            <small>VERDADEIRA LUZ Nº 06</small>
            <h2>Certificado de formação</h2>
            <p>Certificamos a conclusão por</p>
            <h2>{name}</h2>
            <h3>{course.content.title}</h3>
            <p className="k-section">
              Carga horária: {lessons(course).reduce((n, l) => n + l.minutes, 0)} minutos
              <br />
              Conclusão: {new Date(p.completedAt).toLocaleDateString('pt-BR')}
              <br />
              Responsável: {course.content.responsible}
            </p>
            <small>
              Código: {p.certificateCode}
              <br />
              Versão da formação: {p.courseVersion} · Verificação no Portal autenticado
            </small>
          </div>
          <div className="k-actions">
            <button className="k-button primary" onClick={() => window.print()}>
              Imprimir ou salvar em PDF
            </button>
          </div>
        </>
      ) : (
        <Empty
          title="Certificado ainda não disponível"
          description="Conclua as etapas obrigatórias da formação para emitir seu certificado."
        />
      );
  }
  return (
    <div className="knowledge">
      <PageHero
        kicker="Memória e Conhecimento"
        kickerIcon={<GraduationCap size={18} />}
        title={title}
        description={description}
        meta={`Conhecimento VL6 · ${degree === 'aprendiz' ? 'Aprendiz' : degree === 'companheiro' ? 'Companheiro' : 'Mestre'}`}
      />
      <div className="k-nav" aria-label="Atalhos de Conhecimento">
        {canManage && <Link href="/admin/conhecimento">Gestão do Conhecimento</Link>}
        <Link href="/acervo/biblioteca">Biblioteca</Link>
      </div>
      {content}
      {notice && (
        <div role="status" className="k-notice">
          {notice}
        </div>
      )}
    </div>
  );
}
function LessonView({
  course,
  lesson,
  progress,
  onNotice,
  onDone,
}: {
  course: Course;
  lesson: Lesson;
  progress?: KnowledgeProgress;
  onNotice: (s: string) => void;
  onDone: () => void;
}) {
  const router = useRouter(),
    [busy, start] = useTransition(),
    video = useRef<HTMLVideoElement>(null),
    lastSave = useRef(0),
    [position, setPosition] = useState(progress?.positions[lesson.id] ?? 0);
  useEffect(() => {
    saveKnowledgePositionAction(course.id, lesson.id, position).then((r) => {
      if (!r.ok) onNotice(r.error);
    });
  }, [course.id, lesson.id]); // Só registra a abertura; atualizações do vídeo são limitadas a uma escrita/15s.
  const index = lessons(course).findIndex((l) => l.id === lesson.id),
    previous = lessons(course)[index - 1],
    next = lessons(course)[index + 1];
  return (
    <Card className="k-card">
      {lesson.kind === 'video' && (
        <video
          ref={video}
          controls
          preload="metadata"
          aria-label={lesson.title}
          style={{ width: '100%', borderRadius: 8, background: '#000' }}
          src={`/api/conhecimento/media/${course.id}/${lesson.id}`}
          onLoadedMetadata={() => {
            if (video.current) video.current.currentTime = position;
          }}
          onTimeUpdate={(e) => {
            if (Date.now() - lastSave.current > 15000) {
              lastSave.current = Date.now();
              saveKnowledgePositionAction(course.id, lesson.id, e.currentTarget.currentTime).then(
                (r) => {
                  if (!r.ok) onNotice(r.error);
                },
              );
              setPosition(e.currentTarget.currentTime);
            }
          }}
          onPause={(e) =>
            saveKnowledgePositionAction(course.id, lesson.id, e.currentTarget.currentTime).then(
              (r) => {
                if (!r.ok) onNotice(r.error);
              },
            )
          }
        />
      )}
      {['document', 'presentation'].includes(lesson.kind) && (
        <PdfViewer src={`/api/conhecimento/media/${course.id}/${lesson.id}`} title={lesson.title} />
      )}
      {lesson.kind === 'image' && (
        <img
          style={{ maxWidth: '100%', borderRadius: 8 }}
          src={`/api/conhecimento/media/${course.id}/${lesson.id}`}
          alt={lesson.title}
        />
      )}
      {lesson.kind === 'text' && <div className="k-paper">{lesson.text}</div>}
      {lesson.kind === 'link' && (
        <div className="k-note">
          <p>{lesson.text}</p>
          <a
            className="k-button primary"
            href={lesson.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir material externo
          </a>
          <small>O link externo segue as condições de acesso do serviço de origem.</small>
        </div>
      )}
      <h2 className="k-section">{lesson.title}</h2>
      {['activity', 'assessment'].includes(lesson.kind) ? (
        <QuestionActivity course={course} lesson={lesson} progress={progress} />
      ) : (
        <>
          <p>Conteúdo institucional e educativo · {lesson.minutes} min</p>
          <div className="k-row k-between k-section">
            {previous ? (
              <Link className="k-button" href={lessonHref(course, previous.id)}>
                Aula anterior
              </Link>
            ) : (
              <Link className="k-button" href={courseHref(course)}>
                Voltar à formação
              </Link>
            )}
            <button
              className="k-button primary"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const r = await saveKnowledgePositionAction(
                    course.id,
                    lesson.id,
                    video.current?.currentTime ?? position,
                    true,
                  );
                  if (r.ok) {
                    onNotice('Aula concluída. Seu progresso foi salvo.');
                    onDone();
                    router.refresh();
                  } else onNotice(r.error);
                })
              }
            >
              {busy ? 'Salvando…' : 'Marcar como concluída'}
            </button>
            {next && (
              <Link className="k-button" href={lessonHref(course, next.id)}>
                Próxima aula
              </Link>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
function QuestionActivity({
  course,
  lesson,
  progress,
}: {
  course: Course;
  lesson: Lesson;
  progress?: KnowledgeProgress;
}) {
  const router = useRouter(),
    [answers, setAnswers] = useState<Record<string, string | number[]>>({}),
    [error, setError] = useState(''),
    [busy, start] = useTransition(),
    [questions, setQuestions] = useState(lesson.questions);
  useEffect(() => {
    setQuestions(
      course.content.assessment.shuffle
        ? [...lesson.questions].sort(() => Math.random() - 0.5)
        : lesson.questions,
    );
  }, [lesson.id, course.content.assessment.shuffle]);
  const answer = (id: string, value: string | number[]) =>
    setAnswers((a) => ({ ...a, [id]: value }));
  const attempt = progress?.attempts.find((a) => a.lessonId === lesson.id),
    count = progress?.attemptCounts[lesson.id] ?? 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        start(async () => {
          const result = await submitKnowledgeAnswersAction({
            courseId: course.id,
            lessonId: lesson.id,
            version: course.version,
            answers,
          });
          if (result.ok) {
            router.push(`/conhecimento/resultado/${course.id}/${lesson.id}`);
            router.refresh();
          } else setError(result.error);
        });
      }}
    >
      <p>
        {lesson.kind === 'assessment' ? 'Avaliação' : 'Aplicação prática'} · Nota mínima:{' '}
        {course.content.assessment.minimumScore}% · Tentativas: {count}/
        {course.content.assessment.attempts}
      </p>
      {lesson.text && <p>{lesson.text}</p>}
      {questions.map((q, index) => (
        <fieldset className="k-section" key={q.id}>
          <legend>
            <strong>
              {index + 1}. {q.prompt}
            </strong>
          </legend>
          {['choice', 'boolean', 'multiple'].includes(q.type) ? (
            q.options.map((o, i) => (
              <label className="k-option" key={i}>
                <input
                  type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                  name={q.id}
                  checked={Array.isArray(answers[q.id]) && (answers[q.id] as number[]).includes(i)}
                  onChange={(e) => {
                    const a = Array.isArray(answers[q.id]) ? (answers[q.id] as number[]) : [];
                    answer(
                      q.id,
                      q.type === 'multiple'
                        ? e.target.checked
                          ? [...a, i]
                          : a.filter((v) => v !== i)
                        : [i],
                    );
                  }}
                />
                {o}
              </label>
            ))
          ) : q.type === 'reading' ? (
            <label className="k-option">
              <input
                type="checkbox"
                checked={answers[q.id] === 'confirmed'}
                onChange={(e) => answer(q.id, e.target.checked ? 'confirmed' : '')}
              />
              Confirmo que li e compreendi este material.
            </label>
          ) : q.type === 'ordering' || q.type === 'association' ? (
            <>
              {q.type === 'ordering' && <p>Selecione a ordem correta, sem repetir itens.</p>}
              {q.options.map((o, i) => (
                <label className="k-option" key={i}>
                  {q.type === 'association' ? o.split('|')[0] : `Posição ${i + 1}`}
                  <select
                    value={
                      Array.isArray(answers[q.id]) ? ((answers[q.id] as number[])[i] ?? '') : ''
                    }
                    onChange={(e) => {
                      const a = Array.isArray(answers[q.id])
                        ? [...(answers[q.id] as number[])]
                        : Array(q.options.length).fill(-1);
                      a[i] = Number(e.target.value);
                      answer(q.id, a);
                    }}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {q.options.map((x, j) => (
                      <option key={j} value={j}>
                        {q.type === 'association' ? x.split('|')[1] : x}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </>
          ) : (
            <textarea
              aria-label={`Resposta: ${q.prompt}`}
              maxLength={4000}
              value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
              onChange={(e) => answer(q.id, e.target.value)}
              required
            />
          )}
        </fieldset>
      ))}
      {error && (
        <div role="alert" className="k-note">
          {error}
        </div>
      )}
      {attempt?.pendingReview && (
        <div className="k-note">Sua resposta está aguardando análise pelo responsável.</div>
      )}
      <div className="k-actions">
        <button
          className="k-button primary"
          type="submit"
          disabled={busy || !!attempt?.pendingReview || count >= course.content.assessment.attempts}
        >
          {busy
            ? 'Enviando…'
            : lesson.kind === 'assessment'
              ? 'Concluir avaliação'
              : 'Enviar resposta'}
        </button>
      </div>
    </form>
  );
}
