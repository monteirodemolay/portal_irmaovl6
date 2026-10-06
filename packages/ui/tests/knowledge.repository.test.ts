import { describe, expect, it, vi } from 'vitest';
import { knowledgeCourseSchema } from '@vl6/shared';
import { FirestoreKnowledgeRepository } from '../../infra/src/firestore/repositories/knowledge.repository';
const course = {
  id: 'c1',
  tenantId: 'loja',
  ativo: true,
  deletedAt: null,
  version: 1,
  content: knowledgeCourseSchema.parse({
    title: 'Vida em Loja',
    description: 'Estudos institucionais',
    responsible: 'Instrução',
    category: 'Institucional',
    status: 'publicado',
    minimumDegree: 'mestre',
    modules: [
      {
        id: 'm',
        title: 'Introdução',
        lessons: [{ id: 'l', title: 'Vida em Loja', kind: 'text', text: 'Estudo' }],
      },
    ],
  }),
};
function database(records: Record<string, unknown> = {}) {
  const tx = {
    get: vi.fn(async (ref: { key: string }) => ({
      exists: ref.key in records,
      data: () => records[ref.key],
    })),
    set: vi.fn(),
    create: vi.fn(),
  };
  let sequence = 0;
  const db = {
    collection: (name: string) => {
      const c = {
        withConverter: () => c,
        doc: (id?: string) => ({ key: `${name}/${id ?? ++sequence}` }),
      };
      return c;
    },
    runTransaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  return { repo: new FirestoreKnowledgeRepository(db as never), tx };
}
describe('Conhecimento — transações de persistência', () => {
  it('reconsulta o grau dentro da transação e não grava quando incompatível', async () => {
    const { repo, tx } = database({
      'knowledgeCourses/c1': course,
      'members/member1': {
        tenantId: 'loja',
        userId: 'irmao',
        grau: 'aprendiz',
        ativo: true,
        deletedAt: null,
      },
    });
    const mutate = vi.fn();
    await expect(repo.mutateProgress('loja', 'irmao', 'member1', 'c1', mutate)).rejects.toThrow(
      'grau',
    );
    expect(mutate).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.create).not.toHaveBeenCalled();
  });
  it('não aceita um usuário vinculado a outro cadastro', async () => {
    const { repo, tx } = database({
      'knowledgeCourses/c1': course,
      'members/member1': {
        tenantId: 'loja',
        userId: 'outro',
        grau: 'mestre',
        ativo: true,
        deletedAt: null,
      },
    });
    await expect(repo.mutateProgress('loja', 'irmao', 'member1', 'c1', vi.fn())).rejects.toThrow();
    expect(tx.set).not.toHaveBeenCalled();
  });
  it('grava tentativa e progresso na mesma transação e força o vínculo do titular', async () => {
    const { repo, tx } = database({
      'knowledgeCourses/c1': course,
      'members/member1': {
        tenantId: 'loja',
        userId: 'irmao',
        grau: 'mestre',
        ativo: true,
        deletedAt: null,
      },
    });
    const progress = { tenantId: 'loja', userId: 'irmao', courseId: 'c1' };
    await repo.mutateProgress(
      'loja',
      'irmao',
      'member1',
      'c1',
      () => ({ progress, attempt: { id: 'a1' } }) as never,
    );
    expect(tx.set).toHaveBeenCalledOnce();
    expect(tx.create).toHaveBeenCalledWith(
      { key: 'knowledgeAttempts/a1' },
      expect.objectContaining({
        tenantId: 'loja',
        userId: 'irmao',
        memberId: 'member1',
        courseId: 'c1',
      }),
    );
  });
  it('rejeita versão concorrente sem sobrescrever a formação', async () => {
    const { repo, tx } = database({ 'knowledgeCourses/c1': course });
    await expect(repo.saveCourse({ ...course, version: 3 } as never, 2)).rejects.toThrow(
      'outro responsável',
    );
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.create).not.toHaveBeenCalled();
  });
  it('salva formação, versão imutável e auditoria atomicamente', async () => {
    const { repo, tx } = database({ 'knowledgeCourses/c1': course });
    await repo.saveCourse(
      { ...course, version: 2, updatedBy: 'admin', updatedAt: new Date() } as never,
      1,
    );
    expect(tx.set).toHaveBeenCalledOnce();
    expect(tx.create).toHaveBeenCalledTimes(2);
    expect(tx.create).toHaveBeenCalledWith(
      { key: 'knowledgeVersions/1' },
      expect.objectContaining({ courseId: 'c1', version: 2 }),
    );
  });
  it('callback repetido não duplica arquivo nem troca seu vínculo', async () => {
    const asset = { id: 'file1', tenantId: 'loja', courseId: 'c1', pathname: 'loja/c1/file' };
    const { repo, tx } = database({ 'knowledgeAssets/file1': asset });
    await repo.createAsset(asset as never);
    expect(tx.create).not.toHaveBeenCalled();
    await expect(repo.createAsset({ ...asset, courseId: 'outro' } as never)).rejects.toThrow(
      'outro vínculo',
    );
  });
});
