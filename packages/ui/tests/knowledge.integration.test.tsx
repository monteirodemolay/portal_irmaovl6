import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { knowledgeCourseSchema } from '@vl6/shared';
import { KnowledgeMember } from '../../../apps/web/src/modules/knowledge/components/knowledge-member';
import { KnowledgeAdmin } from '../../../apps/web/src/modules/knowledge/components/knowledge-admin';
const mock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
  saveCourse: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mock.push, refresh: mock.refresh }),
}));
vi.mock('../../../apps/web/src/modules/knowledge/actions/knowledge-actions', () => ({
  saveKnowledgePositionAction: mock.save,
  submitKnowledgeAnswersAction: mock.submit,
  saveKnowledgeCourseAction: mock.saveCourse,
  duplicateKnowledgeCourseAction: vi.fn(),
  reviewKnowledgeAttemptAction: vi.fn(),
  findKnowledgeUploadedAssetAction: vi.fn(),
}));
vi.mock('@vl6/ui', () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  PageHero: ({ title, description }: { title: React.ReactNode; description: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
  BookOpen: () => null,
  GraduationCap: () => null,
  Check: () => null,
  Play: () => null,
  FileText: () => null,
  PdfViewer: () => null,
}));
const content = knowledgeCourseSchema.parse({
  title: 'Protocolos de visitação',
  description: 'Recepção e acolhimento',
  responsible: 'Equipe de Instrução',
  category: 'Protocolos',
  libraryItemIds: ['book1'],
  modules: [
    {
      id: 'm1',
      title: 'Acolhimento',
      lessons: [
        { id: 'l1', title: 'Receber visitantes', kind: 'text', text: 'Conteúdo institucional' },
        {
          id: 'l2',
          title: 'Atividade prática',
          kind: 'activity',
          questions: [
            {
              id: 'q1',
              type: 'choice',
              prompt: 'Quem recebe o visitante?',
              options: ['Responsável', 'Ninguém'],
              correct: [0],
            },
          ],
        },
      ],
    },
  ],
});
const course = {
  id: 'c1',
  tenantId: 'tenant1',
  content,
  version: 1,
  reviewerId: null,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'admin',
  updatedBy: 'admin',
  deletedAt: null,
  status: 'active' as const,
  ativo: true,
};
const data = {
  courses: [
    {
      ...course,
      content: {
        ...content,
        modules: content.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => ({
            ...l,
            questions: l.questions.map(({ correct, expected, feedback, ...q }) => q),
          })),
        })),
      },
    },
  ],
  progress: [],
  name: 'Luís Eduardo',
  degree: 'companheiro',
  canManage: false,
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('Conhecimento — interações das telas', () => {
  it('home tem início direto e não exibe gestão ao Irmão comum', () => {
    render(<KnowledgeMember data={data} path={[]} books={[]} />);
    expect(screen.getByRole('link', { name: 'Explorar formações' })).toHaveAttribute(
      'href',
      '/conhecimento/formacoes',
    );
    expect(screen.queryByText('Gestão do Conhecimento')).toBeNull();
  });
  it('pesquisa do catálogo filtra títulos', () => {
    render(<KnowledgeMember data={data} path={['formacoes']} books={[]} />);
    fireEvent.change(screen.getByLabelText('Pesquisar formações'), {
      target: { value: 'inexistente' },
    });
    expect(screen.getByText('Nenhuma formação disponível')).toBeTruthy();
  });
  it('leitura recomendada abre a ficha já existente, sem cópia', () => {
    render(
      <KnowledgeMember
        data={data}
        path={['formacao', 'c1']}
        books={[
          { id: 'book1', title: 'História VL6', author: 'Autor', format: 'fisico', cover: null },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Ver na Biblioteca' })).toHaveAttribute(
      'href',
      '/acervo/biblioteca/book1',
    );
  });
  it('conclusão aguarda o salvamento no servidor e exibe confirmação', async () => {
    mock.save.mockResolvedValue({ ok: true, value: { saved: true } });
    render(<KnowledgeMember data={data} path={['aula', 'c1', 'l1']} books={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como concluída' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('progresso foi salvo'),
    );
    expect(mock.save).toHaveBeenCalledWith('c1', 'l1', 0, true);
  });
  it('erro de permissão é apresentado sem falsa confirmação', async () => {
    mock.save.mockResolvedValue({ ok: false, error: 'Conteúdo indisponível para seu grau.' });
    render(<KnowledgeMember data={data} path={['aula', 'c1', 'l1']} books={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como concluída' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('indisponível'));
    expect(screen.queryByText('Aula concluída. Seu progresso foi salvo.')).toBeNull();
  });
  it('atividade envia alternativas e versão, nunca nota do cliente', async () => {
    mock.save.mockResolvedValue({ ok: true, value: { saved: true } });
    mock.submit.mockResolvedValue({ ok: true, value: { passed: true } });
    render(<KnowledgeMember data={data} path={['aula', 'c1', 'l2']} books={[]} />);
    fireEvent.click(screen.getByLabelText('Responsável'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await waitFor(() => expect(mock.submit).toHaveBeenCalled());
    const payload = mock.submit.mock.calls[0]![0];
    expect(payload).toEqual({ courseId: 'c1', lessonId: 'l2', version: 1, answers: { q1: [0] } });
    expect(mock.push).toHaveBeenCalledWith('/conhecimento/resultado/c1/l2');
  });
  it('admin organiza módulos e seleciona graus exatos', () => {
    render(
      <KnowledgeAdmin
        tenantId="tenant1"
        courses={[]}
        progress={[]}
        books={[]}
        path={['novo']}
        pending={[]}
        members={[]}
        versions={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '2. Módulos e aulas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar módulo' }));
    expect(screen.getByDisplayValue('Módulo 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '5. Público' }));
    fireEvent.change(screen.getByLabelText('Regra de acesso'), { target: { value: 'selected' } });
    expect(screen.getByLabelText('Aprendiz')).toBeTruthy();
    expect(screen.getByLabelText('Companheiro')).toBeTruthy();
    expect(screen.getByLabelText('Mestre')).toBeTruthy();
  });
});
