import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  publish: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  notify: vi.fn(),
  event: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth/require-session', () => ({ requireSession: mocks.session }));
vi.mock('@/modules/notification/lib/notify-all-active-users', () => ({
  notifyAllActiveUsers: mocks.notify,
}));
vi.mock('@/lib/content/scrape-news-metadata', () => ({ scrapeNewsMetadata: vi.fn() }));
vi.mock('@/lib/content/sync-news-media-to-archive', () => ({ syncNewsMediaToArchive: vi.fn() }));
vi.mock('@vl6/infra', () => ({
  createServerContainer: () => ({
    useCases: {
      publishAnnouncement: { execute: mocks.publish },
      createAnnouncement: { execute: mocks.create },
      updateAnnouncement: { execute: mocks.update },
    },
    repositories: { event: { findById: mocks.event } },
  }),
}));
import {
  createWorkspaceAnnouncementAction,
  updateAnnouncementAction,
  toggleAnnouncementPublishedAction,
} from './content-actions';

const announcement = {
  id: 'a1',
  titulo: 'Aviso',
  descricao: 'Conteúdo',
  prioridade: 'media',
  dataExpiracao: null,
  requiresAcknowledgement: false,
};
const context = {
  tenantId: 't1',
  uid: 'editor',
  permissions: ['event:read', 'announcement:create'],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ authContext: context });
  mocks.event.mockResolvedValue({ id: 'e1', tenantId: 't1', deletedAt: null });
  mocks.create.mockImplementation(async (_ctx, input) => ({
    ok: true,
    value: { id: 'a1', ...input },
  }));
  mocks.update.mockImplementation(async (_ctx, _id, input) => ({
    ok: true,
    value: { id: 'a1', ...input },
  }));
});
function form(choice?: string) {
  const data = new FormData();
  data.set('titulo', 'Aviso');
  data.set('descricao', 'Conteúdo');
  data.set('prioridade', 'media');
  data.set('requiresAcknowledgement', 'on');
  if (choice !== undefined) data.set('notificarIrmaos', choice);
  return data;
}
describe('escolha explícita das notificações de avisos', () => {
  it.each([undefined, '', 'false', 'outro'])(
    'recusa cadastro sem escolha válida (%s)',
    async (choice) => {
      const result = await createWorkspaceAnnouncementAction('e1', { error: null }, form(choice));
      expect(result.error).toContain('Sim ou Não');
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );
  it('salva Não e desativa exigência de ciência sem notificação', async () => {
    const result = await createWorkspaceAnnouncementAction('e1', { error: null }, form('nao'));
    expect(result.error).toBeNull();
    expect(mocks.create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ notificarIrmaos: false, requiresAcknowledgement: false }),
    );
  });
  it('salva Sim com ciência quando selecionada', async () => {
    await createWorkspaceAnnouncementAction('e1', { error: null }, form('sim'));
    expect(mocks.create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ notificarIrmaos: true, requiresAcknowledgement: true }),
    );
  });
  it('edição também exige a escolha', async () => {
    expect((await updateAnnouncementAction('a1', { error: null }, form())).error).toContain(
      'Sim ou Não',
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('publica Não sem chamar o envio de notificações', async () => {
    mocks.publish.mockResolvedValue({
      ok: true,
      value: { ...announcement, notificarIrmaos: false },
    });
    await toggleAnnouncementPublishedAction('a1', true);
    expect(mocks.publish).toHaveBeenCalledWith(context, 'a1', true);
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it('publica Sim e mantém deduplicação por destinatário', async () => {
    mocks.publish.mockResolvedValue({
      ok: true,
      value: { ...announcement, notificarIrmaos: true },
    });
    await toggleAnnouncementPublishedAction('a1', true);
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    const options = mocks.notify.mock.calls[0]![2];
    expect(options.dedupeKey('u1')).toBe('announcement:a1:user:u1');
  });
  it('despublicação nunca envia notificação', async () => {
    mocks.publish.mockResolvedValue({
      ok: true,
      value: { ...announcement, notificarIrmaos: true },
    });
    await toggleAnnouncementPublishedAction('a1', false);
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
