// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
const mocks = vi.hoisted(() => ({ permission: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/auth/require-permission', () => ({
  requirePagePermission: mocks.permission,
}));
vi.mock('@vl6/infra', () => ({
  createServerContainer: () => ({
    useCases: { listAllEvents: { execute: mocks.list } },
  }),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
import Page from './page';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  vi.resetAllMocks();
});
function session(permissions: string[]) {
  const s = {
    authContext: { tenantId: 'loja', uid: 'u', permissions },
    role: { chave: 'editor', sistemico: false, permissoes: permissions },
  };
  mocks.permission.mockImplementation(async (p: string) => {
    if (!permissions.includes(p)) throw new Error('NOT_FOUND');
    return s;
  });
  return s;
}
async function render(content: string) {
  const page = await Page({
    searchParams: Promise.resolve({ conteudo: content }),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(page));
}
const event = (id: string) => ({
  id,
  titulo: `Sessão ${id}`,
  dataInicio: new Date('2026-10-24T12:00:00Z'),
});
describe('Preparar comunicação', () => {
  it('percorre páginas no contexto da Loja, abre ficha e não oferece novo cadastro sem permissão', async () => {
    const s = session(['news:create', 'news:read', 'event:read']);
    mocks.list
      .mockResolvedValueOnce({
        items: [event('a')],
        hasMore: true,
        nextCursor: 'next',
      })
      .mockResolvedValueOnce({ items: [event('b')], hasMore: false });
    await render('noticia');
    expect(mocks.list).toHaveBeenNthCalledWith(2, s.authContext, {
      limit: 100,
      cursor: 'next',
    });
    expect(
      host.querySelector('a[href="/admin/publicacoes/b#noticia"]'),
    ).not.toBeNull();
    expect(host.querySelector('a[href="/admin/publicacoes/novo"]')).toBeNull();
    expect(
      host.querySelector('a[href="/admin/conteudo/avisos/novo"]'),
    ).toBeNull();
  });
  it('oferece aviso vinculado, avulso e novo acontecimento com permissões completas', async () => {
    session([
      'announcement:create',
      'announcement:read',
      'event:read',
      'event:create',
    ]);
    mocks.list.mockResolvedValue({ items: [event('a')], hasMore: false });
    await render('aviso');
    for (const href of [
      '/admin/publicacoes/a#aviso',
      '/admin/conteudo/avisos/novo',
      '/admin/publicacoes/novo',
    ])
      expect(host.querySelector(`a[href="${href}"]`)).not.toBeNull();
  });
  it('não consulta ou serializa Agenda sem leitura, mas mantém aviso avulso', async () => {
    session(['announcement:create', 'event:create']);
    await render('aviso');
    expect(mocks.list).not.toHaveBeenCalled();
    expect(host.querySelector('input')).toBeNull();
    expect(
      host.querySelector('a[href="/admin/conteudo/avisos/novo"]'),
    ).not.toBeNull();
    expect(host.querySelector('a[href="/admin/publicacoes/novo"]')).toBeNull();
  });
  it('mantém aviso avulso quando há leitura da Agenda, mas não dos avisos', async () => {
    session(['announcement:create', 'event:read']);
    await render('aviso');
    expect(mocks.list).not.toHaveBeenCalled();
    expect(host.querySelector('input')).toBeNull();
    expect(
      host.querySelector('a[href="/admin/conteudo/avisos/novo"]'),
    ).not.toBeNull();
  });
  it('nega acesso direto sem permissões e rejeita tipo inválido', async () => {
    session(['news:create', 'event:read']);
    await expect(render('noticia')).rejects.toThrow('NOT_FOUND');
    session(['event:read']);
    for (const type of ['noticia', 'aviso', 'invalido'])
      await expect(render(type)).rejects.toThrow('NOT_FOUND');
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('falha parcial fica explícita e preserva os resultados carregados', async () => {
    session(['news:create', 'news:read', 'event:read']);
    mocks.list
      .mockResolvedValueOnce({
        items: [event('a')],
        hasMore: true,
        nextCursor: 'next',
      })
      .mockRejectedValueOnce(new Error('offline'));
    await render('noticia');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'lista pode estar incompleta',
    );
    expect(
      host.querySelector('a[href="/admin/publicacoes/a#noticia"]'),
    ).not.toBeNull();
  });
});
