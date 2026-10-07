import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@vl6/domain';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  event: vi.fn(),
  news: vi.fn(),
  announcement: vi.fn(),
  updateNews: vi.fn(),
  updateAnnouncement: vi.fn(),
  publishNews: vi.fn(),
  publishAnnouncement: vi.fn(),
  sync: vi.fn(),
  revalidate: vi.fn(),
  template: vi.fn(),
  createArt: vi.fn(),
  instagram: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/lib/auth/require-session', () => ({ requireSession: mocks.session }));
vi.mock('@vl6/infra', () => ({
  createServerContainer: () => ({
    repositories: {
      event: { findById: mocks.event },
      artTemplate: { findById: mocks.template },
      news: { findById: mocks.news },
      announcement: { findById: mocks.announcement },
    },
    useCases: {
      updateNews: { execute: mocks.updateNews },
      createPublicationFromEvent: { execute: mocks.createArt },
      updateAnnouncement: { execute: mocks.updateAnnouncement },
    },
  }),
}));
vi.mock('@/modules/content/actions/content-actions', () => ({
  toggleNewsPublishedAction: mocks.publishNews,
  toggleAnnouncementPublishedAction: mocks.publishAnnouncement,
}));
vi.mock('@/modules/content/actions/news-instagram-actions', () => ({
  updateNewsInstagramLinksAction: mocks.instagram,
}));
vi.mock('@/lib/content/sync-news-media-to-archive', () => ({ syncNewsMediaToArchive: mocks.sync }));
import {
  linkWorkspaceContentAction,
  createWorkspaceArtAction,
  saveWorkspaceInstagramLinksAction,
  setWorkspacePublicationAction,
} from './publication-workspace-actions';

const ctx: AuthContext = {
  uid: 'editor',
  tenantId: 't1',
  roleId: 'editor',
  permissions: ['event:read', 'news:manage', 'announcement:manage', 'communication:manage'],
};
const news = {
  id: 'n1',
  tenantId: 't1',
  eventId: null,
  deletedAt: null,
  titulo: 'Notícia existente',
  subtitulo: null,
  slug: 'noticia-existente',
  imagemCapaUrl: null,
  conteudoHtml: '<p>Texto original</p>',
  categoria: 'Loja',
  dataPublicacao: null,
  instagramUrls: ['https://instagram.com/p/existente'],
};
const announcement = {
  id: 'a1',
  tenantId: 't1',
  eventId: null,
  deletedAt: null,
  titulo: 'Aviso existente',
  descricao: 'Texto original',
  prioridade: 'media',
  destacar: false,
  dataExpiracao: null,
  requiresAcknowledgement: true,
};
const form = () => {
  const data = new FormData();
  data.set('contentId', 'n1');
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ authContext: ctx });
  mocks.event.mockResolvedValue({ id: 'e1', tenantId: 't1', deletedAt: null });
  mocks.news.mockResolvedValue(news);
  mocks.announcement.mockResolvedValue(announcement);
  mocks.updateNews.mockImplementation(async (_ctx, _id, input) => ({
    ok: true,
    value: { ...news, ...input },
  }));
  mocks.updateAnnouncement.mockImplementation(async (_ctx, _id, input) => ({
    ok: true,
    value: { ...announcement, ...input },
  }));
});
describe('Espaço único de publicação', () => {
  it('vincula notícia existente sem recadastrar e conserva texto e links externos', async () => {
    const result = await linkWorkspaceContentAction('e1', 'news', { error: null }, form());
    expect(result.error).toBeNull();
    expect(mocks.updateNews).toHaveBeenCalledWith(
      ctx,
      'n1',
      expect.objectContaining({
        eventId: 'e1',
        conteudoHtml: news.conteudoHtml,
        instagramUrls: news.instagramUrls,
      }),
    );
    expect(mocks.sync).toHaveBeenCalledWith(
      expect.objectContaining({ news: expect.objectContaining({ id: 'n1', eventId: 'e1' }) }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin/publicacoes/e1');
  });
  it('vincula aviso preservando confirmação de ciência', async () => {
    const data = form();
    data.set('contentId', 'a1');
    expect(
      (await linkWorkspaceContentAction('e1', 'announcement', { error: null }, data)).error,
    ).toBeNull();
    expect(mocks.updateAnnouncement).toHaveBeenCalledWith(
      ctx,
      'a1',
      expect.objectContaining({
        eventId: 'e1',
        requiresAcknowledgement: true,
        descricao: announcement.descricao,
      }),
    );
  });
  it('rejeita evento de outro tenant antes de alterar conteúdo', async () => {
    mocks.event.mockResolvedValue({ id: 'e1', tenantId: 'outro', deletedAt: null });
    expect(
      (await linkWorkspaceContentAction('e1', 'news', { error: null }, form())).error,
    ).toBeTruthy();
    expect(mocks.updateNews).not.toHaveBeenCalled();
  });
  it('não transfere notícia já vinculada a outro acontecimento', async () => {
    mocks.news.mockResolvedValue({ ...news, eventId: 'outro-evento' });
    expect(
      (await linkWorkspaceContentAction('e1', 'news', { error: null }, form())).error,
    ).toBeTruthy();
    expect(mocks.updateNews).not.toHaveBeenCalled();
  });
  it('não publica conteúdo de outro tenant nem conteúdo fora do acontecimento', async () => {
    for (const overrides of [
      { tenantId: 'outro', eventId: 'e1' },
      { eventId: 'e2' },
      { eventId: 'e1', deletedAt: new Date() },
    ]) {
      mocks.news.mockResolvedValue({ ...news, ...overrides });
      expect((await setWorkspacePublicationAction('e1', 'news', 'n1', true)).error).toBeTruthy();
    }
    expect(mocks.publishNews).not.toHaveBeenCalled();
  });
  it('exige permissão de publicação mesmo com leitura e edição', async () => {
    mocks.session.mockResolvedValue({
      authContext: { ...ctx, permissions: ['event:read', 'news:read', 'news:update'] },
    });
    await expect(setWorkspacePublicationAction('e1', 'news', 'n1', true)).rejects.toThrow();
    expect(mocks.publishNews).not.toHaveBeenCalled();
  });
  it('reutiliza a ação existente de publicação e permanece no espaço', async () => {
    mocks.news.mockResolvedValue({ ...news, eventId: 'e1' });
    expect((await setWorkspacePublicationAction('e1', 'news', 'n1', true)).success).toBe(
      'Publicado no Portal.',
    );
    expect(mocks.publishNews).toHaveBeenCalledWith('n1', true);
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin/publicacoes/e1');
  });
  it('informa falha parcial e recarrega o estado real em vez de anunciar sucesso', async () => {
    mocks.announcement.mockResolvedValue({ ...announcement, eventId: 'e1' });
    mocks.publishAnnouncement.mockRejectedValue(new Error('Notificação falhou depois da escrita'));
    const result = await setWorkspacePublicationAction('e1', 'announcement', 'a1', true);
    expect(result.error).toContain('situação atual');
    expect(result.success).toBeUndefined();
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin/publicacoes/e1');
  });
  it('prepara a arte com o evento canônico e reutiliza o caso de uso idempotente', async () => {
    mocks.template.mockResolvedValue({ id: 'tpl1', tenantId: 't1', active: true, type: 'session' });
    mocks.createArt.mockResolvedValue({ ok: true, value: { id: 'p1' } });
    const data = new FormData();
    data.set('templateId', 'tpl1');
    expect((await createWorkspaceArtAction('e1', { error: null }, data)).error).toBeNull();
    expect(mocks.createArt).toHaveBeenCalledWith(ctx, 'e1', 'tpl1');
    expect(mocks.revalidate).toHaveBeenCalledWith('/admin/publicacoes/e1');
  });
  it('rejeita modelo de outra Loja sem criar arte', async () => {
    mocks.template.mockResolvedValue({
      id: 'tpl1',
      tenantId: 'outra',
      active: true,
      type: 'session',
    });
    const data = new FormData();
    data.set('templateId', 'tpl1');
    expect((await createWorkspaceArtAction('e1', { error: null }, data)).error).toBeTruthy();
    expect(mocks.createArt).not.toHaveBeenCalled();
  });
  it('salva links externos apenas na notícia vinculada ao mesmo evento', async () => {
    const data = new FormData();
    data.set('instagramUrls', 'https://instagram.com/p/existente');
    expect(
      (await saveWorkspaceInstagramLinksAction('e1', 'n1', { error: null }, data)).error,
    ).toBeTruthy();
    expect(mocks.instagram).not.toHaveBeenCalled();
    mocks.news.mockResolvedValue({ ...news, eventId: 'e1' });
    expect(
      (await saveWorkspaceInstagramLinksAction('e1', 'n1', { error: null }, data)).error,
    ).toBeNull();
    expect(mocks.instagram).toHaveBeenCalledWith('n1', data);
  });
});
