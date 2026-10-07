import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, type News } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { EventForm } from '@/modules/agenda/components/event-form';
import { updateWorkspaceEventAction } from '@/modules/agenda/actions/agenda-actions';
import {
  resolveArchiveItem,
  type ResolvedArchiveItem,
} from '@/modules/archive/lib/resolve-archive-item';
import { PublishWizard } from '@/modules/archive/components/publish-hub/publish-wizard';
import {
  WorkspaceAnnouncementEditor,
  WorkspaceArtForm,
  WorkspaceInstagramForm,
  WorkspaceLinkForm,
  WorkspaceNewsEditor,
} from '@/modules/admin/components/publication-editors';

import { ModerateCommentsPanel } from '@/modules/content/components/moderate-comments-panel';
import { resolveCommentAuthorNames } from '@/modules/content/lib/resolve-comment-authors';
import { AnnouncementReachReportCard } from '@/modules/content/components/announcement-reach-report';
import { PublicationArtGenerator } from '@/modules/communication/components/publication-art-generator';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Espaço de publicação · VL6' };

export default async function PublicationWorkspacePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await requirePagePermission('event:read'),
    ctx = session.authContext;
  const { eventId } = await params;
  const c = createServerContainer();
  const event = await c.repositories.event.findById(eventId);
  if (!event || event.tenantId !== ctx.tenantId || event.deletedAt) notFound();
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(ctx, permission);
  const errors: string[] = [];
  async function load<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await read();
    } catch {
      errors.push(label);
      return fallback;
    }
  }
  const [news, announcements, archive, entities, attachments] = await Promise.all([
    can('news:read')
      ? load(
          'Notícias',
          async () => {
            // Percorre o histórico: um evento antigo não desaparece por estar além da primeira página.
            const all: News[] = [];
            let cursor: string | null = null;
            do {
              const page = await c.useCases.listAllNews.execute(ctx, {
                limit: 500,
                cursor: cursor ?? undefined,
              });
              all.push(...page.items);
              cursor = page.hasMore ? page.nextCursor : null;
            } while (cursor);
            return all;
          },
          [],
        )
      : [],
    can('announcement:read')
      ? load('Avisos', () => c.useCases.listAllAnnouncements.execute(ctx), [])
      : [],
    can('archiveItem:read')
      ? load(
          'Arquivos',
          async () =>
            (await c.repositories.archiveItem.findByEventId(eventId)).filter(
              (a) => a.tenantId === ctx.tenantId && !a.deletedAt,
            ),
          [],
        )
      : [],
    can('event:update')
      ? load(
          'Entidades paramaçônicas',
          () => c.repositories.paramasonicEntity.listByTenant(ctx.tenantId),
          [],
        )
      : [],
    can('event:update')
      ? load(
          'Anexos do acontecimento',
          async () =>
            (
              await Promise.all(
                (event.arquivosRelacionados ?? []).map((id) => resolveArchiveItem(id, ctx, c)),
              )
            ).filter((a): a is ResolvedArchiveItem => a !== null),
          [],
        )
      : [],
  ]);
  const relatedNews = news.filter((n) => n.eventId === eventId);
  const relatedAnnouncements = announcements.filter((a) => a.eventId === eventId);
  const comments = can('news:manage')
    ? await load(
        'Comentários',
        async () =>
          (await c.useCases.listPendingNewsComments.execute(ctx)).filter((comment) =>
            relatedNews.some((n) => n.id === comment.newsId),
          ),
        [],
      )
    : [];
  const authorNames = await load(
    'Autores dos comentários',
    () => resolveCommentAuthorNames(c, ctx.tenantId, comments),
    {},
  );
  const templates = can('communication:manage')
    ? await load('Modelos de arte', () => c.useCases.listArtTemplates.execute(ctx), [])
    : [];
  const publications = can('communication:manage')
    ? await load(
        'Artes',
        async () =>
          (await c.useCases.listPublications.execute(ctx, null)).filter(
            (p) => p.sourceType === 'agenda_event' && p.sourceId === eventId,
          ),
        [],
      )
    : [];
  const photos = can('archiveMedia:read')
    ? await load(
        'Fotografias',
        async () =>
          (
            await Promise.all(
              archive.map((a) => c.repositories.archiveMedia.findByArchiveItemId(a.id)),
            )
          )
            .flat()
            .filter(
              (m) =>
                m.tenantId === ctx.tenantId &&
                m.eventId === eventId &&
                !m.deletedAt &&
                m.mediaType === 'foto' &&
                m.publicacaoStatus === 'publicado' &&
                m.accessLevel !== 'administracao',
            )
            .map((m) => ({
              id: m.id,
              url: `/api/archive-media/${m.id}`,
              label: m.caption ?? m.altText ?? 'Fotografia do acontecimento',
            })),
        [],
      )
    : [];
  const option = {
    id: event.id,
    titulo: event.titulo,
    dataInicio: event.dataInicio.toISOString(),
    local: event.local,
    tipo: event.tipo,
  };
  const newsReady = can('news:read') && !errors.includes('Notícias');
  const announcementsReady = can('announcement:read') && !errors.includes('Avisos');
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link href="/admin/publicacoes" className="text-sm underline">
        ← Publicações e Agenda
      </Link>
      <header className="border-border bg-surface rounded-2xl border p-6">
        <p className="text-accent text-sm font-semibold">Espaço único de publicação</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">{event.titulo}</h1>
        <p className="text-muted mt-2">
          {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'long',
            timeZone: 'America/Sao_Paulo',
          }).format(event.dataInicio)}{' '}
          · {event.local}
        </p>
        <p className="text-muted mt-3 text-sm">
          Edite o acontecimento, a notícia, o aviso e os arquivos aqui. Os painéis permanecem
          abertos enquanto você trabalha e cada salvamento mantém o vínculo com este acontecimento.
        </p>
        <nav aria-label="Etapas da publicação" className="mt-5 flex flex-wrap gap-2">
          {[
            'Acontecimento',
            ...(newsReady ? ['Notícia'] : []),
            ...(announcementsReady ? ['Aviso'] : []),
            ...(can('archiveItem:read') ? ['Arquivos'] : []),
            ...(can('communication:manage') ? ['Artes'] : []),
          ].map((label, i) => (
            <a
              key={label}
              href={`#${label === 'Notícia' ? 'noticia' : label.toLowerCase()}`}
              className="border-border rounded-lg border px-4 py-2 text-sm"
            >
              {i + 1}. {label}
            </a>
          ))}
        </nav>
      </header>
      {errors.length > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Não foi possível carregar: {errors.join(', ')}. Recarregue para retomar esses conteúdos;
          os demais continuam disponíveis.
        </p>
      )}
      <section
        id="acontecimento"
        className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6"
      >
        <h2 className="font-display mb-4 text-2xl font-semibold">Acontecimento</h2>
        {can('event:update') ? (
          <details>
            <summary className="cursor-pointer font-semibold">
              Editar dados, classificação e anexos
            </summary>
            <div className="mt-5">
              <EventForm
                event={event}
                action={updateWorkspaceEventAction.bind(null, eventId)}
                initialAttachments={attachments}
                paramasonicEntities={entities.map((e) => ({
                  id: e.id,
                  label: e.unitNumber ? `${e.shortName} nº ${e.unitNumber}` : e.shortName,
                }))}
              />
            </div>
          </details>
        ) : (
          <p className="text-muted">{event.descricao}</p>
        )}
      </section>
      {newsReady && (
        <section
          id="noticia"
          className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6"
        >
          <h2 className="font-display mb-4 text-2xl font-semibold">Notícia</h2>
          {can('news:update') && (
            <WorkspaceLinkForm
              eventId={eventId}
              kind="news"
              options={news.filter((n) => !n.eventId).map((n) => ({ id: n.id, title: n.titulo }))}
            />
          )}
          {relatedNews.map((n) => (
            <details
              key={n.id}
              open={relatedNews.length === 1}
              className="border-border mb-4 rounded-xl border p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {n.titulo} · {n.publicado ? 'Publicado' : 'Rascunho'}
              </summary>
              <div className="mt-5">
                {can('news:update') ? (
                  <WorkspaceNewsEditor
                    event={option}
                    news={n}
                    photos={photos}
                    canPublish={can('news:publish')}
                  />
                ) : (
                  <p className="text-muted">{n.subtitulo}</p>
                )}
                {can('news:update') && <WorkspaceInstagramForm eventId={eventId} news={n} />}
                {can('news:manage') && (
                  <div className="mt-5">
                    <h3 className="mb-3 text-sm font-semibold">Comentários aguardando moderação</h3>
                    <ModerateCommentsPanel
                      comments={comments.filter((comment) => comment.newsId === n.id)}
                      authorNames={authorNames}
                    />
                  </div>
                )}
                <Link
                  className="mt-4 inline-block text-xs underline"
                  href={`/admin/conteudo/noticias/${n.id}`}
                >
                  Abrir registro original e opções de exclusão
                </Link>
              </div>
            </details>
          ))}
          {can('news:create') && (
            <details open={!relatedNews.length} key={`new-news-${relatedNews.length}`}>
              <summary className="cursor-pointer font-semibold">
                {relatedNews.length
                  ? 'Adicionar outra notícia a este acontecimento'
                  : 'Escrever notícia deste acontecimento'}
              </summary>
              <div className="mt-5">
                <WorkspaceNewsEditor event={option} photos={photos} canPublish={false} />
              </div>
            </details>
          )}
        </section>
      )}
      {announcementsReady && (
        <section id="aviso" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
          <h2 className="font-display mb-4 text-2xl font-semibold">Aviso</h2>
          {can('announcement:update') && (
            <WorkspaceLinkForm
              eventId={eventId}
              kind="announcement"
              options={announcements
                .filter((a) => !a.eventId)
                .map((a) => ({ id: a.id, title: a.titulo }))}
            />
          )}
          {relatedAnnouncements.map((a) => (
            <details
              key={a.id}
              open={relatedAnnouncements.length === 1}
              className="border-border mb-4 rounded-xl border p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {a.titulo} · {a.publicado ? 'Publicado' : 'Rascunho'}
              </summary>
              <div className="mt-5">
                {can('announcement:update') ? (
                  <WorkspaceAnnouncementEditor
                    eventId={eventId}
                    title={event.titulo}
                    announcement={a}
                    canPublish={can('announcement:publish')}
                  />
                ) : (
                  <p className="text-muted">{a.descricao}</p>
                )}
                {a.publicado && can('notification:manage') && (
                  <div className="mt-5">
                    <AnnouncementReachReportCard announcementId={a.id} />
                  </div>
                )}
                <Link
                  className="mt-4 inline-block text-xs underline"
                  href={`/admin/conteudo/avisos/${a.id}`}
                >
                  Abrir registro original e opções de exclusão
                </Link>
              </div>
            </details>
          ))}
          {can('announcement:create') && (
            <details
              open={!relatedAnnouncements.length}
              key={`new-announcement-${relatedAnnouncements.length}`}
            >
              <summary className="cursor-pointer font-semibold">
                {relatedAnnouncements.length
                  ? 'Adicionar outro aviso a este acontecimento'
                  : 'Preparar aviso deste acontecimento'}
              </summary>
              <div className="mt-5">
                <WorkspaceAnnouncementEditor
                  eventId={eventId}
                  title={event.titulo}
                  canPublish={false}
                />
              </div>
            </details>
          )}
        </section>
      )}
      {can('archiveItem:read') && !errors.includes('Arquivos') && (
        <section
          id="arquivos"
          className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6"
        >
          <h2 className="font-display mb-2 text-2xl font-semibold">Fotos, vídeos e documentos</h2>
          <p className="text-muted mb-5 text-sm">
            Envie, classifique, organize, revise e publique os arquivos aqui. As fotos publicadas
            podem ser utilizadas na notícia sem um novo envio.
          </p>
          {can('archiveItem:create')
            ? (archive.length ? archive : [null]).map((a) => (
                <details key={a?.id ?? 'new-archive'} open={archive.length <= 1} className="mb-4">
                  <summary className="cursor-pointer font-semibold">
                    {a
                      ? `${a.titulo} · ${a.publicacaoStatus}`
                      : 'Adicionar arquivos ao acontecimento'}
                  </summary>
                  <div className="mt-5">
                    <PublishWizard
                      initialEvent={event}
                      initialArchiveItemId={a?.id ?? null}
                      events={[event]}
                      drafts={archive.filter((a) => a.publicacaoStatus === 'rascunho')}
                      boardTerms={[]}
                      eventPublishState={{}}
                    />
                  </div>
                </details>
              ))
            : archive.map((a) => (
                <p key={a.id} className="text-sm">
                  {a.titulo} · {a.publicacaoStatus}
                </p>
              ))}
        </section>
      )}
      {can('communication:manage') && !errors.includes('Artes') && (
        <section id="artes" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
          <h2 className="font-display mb-2 text-2xl font-semibold">Artes e divulgação</h2>
          <p className="text-muted mb-5 text-sm">
            Prepare a arte a partir dos dados deste acontecimento. A distribuição externa continua
            manual, com registro dos canais utilizados.
          </p>
          {!publications.length &&
            (templates.some((t) => t.active && t.type === 'session') ? (
              <WorkspaceArtForm
                eventId={eventId}
                templates={templates.filter((t) => t.active && t.type === 'session')}
              />
            ) : (
              <p className="text-muted text-sm">
                Cadastre um modelo ativo de sessão em{' '}
                <Link href="/admin/comunicacao/modelos" className="underline">
                  Modelos de arte
                </Link>{' '}
                para utilizar este painel.
              </p>
            ))}
          {publications.map((p) => {
            const template = templates.find(
              (t) => t.id === p.templateId && t.tenantId === ctx.tenantId,
            );
            return template ? (
              <details key={p.id} open className="mb-4">
                <summary className="cursor-pointer font-semibold">
                  {p.title} · {template.name}
                </summary>
                <div className="mt-5">
                  <PublicationArtGenerator publication={p} template={template} />
                </div>
              </details>
            ) : (
              <p key={p.id} role="alert" className="text-sm text-amber-700">
                Modelo de “{p.title}” não disponível neste painel.
              </p>
            );
          })}
        </section>
      )}
    </div>
  );
}
