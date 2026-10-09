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
import { archiveEventRecordAction } from '@/modules/admin/actions/event-record-actions';
import { ModerateCommentsPanel } from '@/modules/content/components/moderate-comments-panel';
import { resolveCommentAuthorNames } from '@/modules/content/lib/resolve-comment-authors';
import { AnnouncementReachReportCard } from '@/modules/content/components/announcement-reach-report';
import { PublicationArtGenerator } from '@/modules/communication/components/publication-art-generator';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '@/lib/audit/audit-action-label';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ficha do Acontecimento · VL6' };

function statusClass(state: 'ok' | 'attention' | 'empty') {
  if (state === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (state === 'attention') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-border bg-surface text-muted';
}

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

  const [news, announcements, archive, entities, attachments, boardTerms] = await Promise.all([
    can('news:read')
      ? load(
          'Notícias',
          async () => {
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
          'Acervo',
          async () =>
            (await c.repositories.archiveItem.findByEventId(eventId)).filter(
              (a) => a.tenantId === ctx.tenantId && !a.deletedAt,
            ),
          [],
        )
      : [],
    can('event:update')
      ? load('Entidades paramaçônicas', () => c.repositories.paramasonicEntity.listByTenant(ctx.tenantId), [])
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
    can('boardTerm:read')
      ? load('Gestões', () => c.useCases.listBoardTerms.execute(ctx), [])
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

  const archiveMedia = can('archiveMedia:read')
    ? await load(
        'Mídias do Acervo',
        async () =>
          (
            await Promise.all(archive.map((a) => c.repositories.archiveMedia.findByArchiveItemId(a.id)))
          )
            .flat()
            .filter((m) => m.tenantId === ctx.tenantId && m.eventId === eventId && !m.deletedAt),
        [],
      )
    : [];

  const photos = archiveMedia
    .filter(
      (m) =>
        m.mediaType === 'foto' &&
        m.publicacaoStatus === 'publicado' &&
        m.accessLevel !== 'administracao',
    )
    .map((m) => ({
      id: m.id,
      url: `/api/archive-media/${m.id}`,
      label: m.caption ?? m.altText ?? 'Fotografia do acontecimento',
    }));

  const publishedVisual = archiveMedia.filter(
    (m) =>
      (m.mediaType === 'foto' || m.mediaType === 'video') &&
      m.publicacaoStatus === 'publicado' &&
      m.accessLevel !== 'administracao',
  );
  const photoCount = archiveMedia.filter((m) => m.mediaType === 'foto').length;
  const videoCount = archiveMedia.filter((m) => m.mediaType === 'video').length;
  const documentCount = archiveMedia.filter((m) => m.mediaType === 'documento').length;
  const publishedArchiveCount = archive.filter((a) => a.publicacaoStatus === 'publicado').length;
  const identifiedPeople = new Set(
    archiveMedia.flatMap((m) => (Array.isArray(m.pessoasIdentificadas) ? m.pessoasIdentificadas : [])),
  );

  const eventTime = event.dataInicio.getTime();
  const management = boardTerms.find(
    (term) =>
      eventTime >= new Date(term.periodoInicio).getTime() &&
      eventTime <= new Date(term.periodoFim).getTime(),
  );
  const entity = event.paramasonicEntityId
    ? entities.find((item) => item.id === event.paramasonicEntityId)
    : null;

  const relatedIds = new Set<string>([
    eventId,
    ...relatedNews.map((n) => n.id),
    ...relatedAnnouncements.map((a) => a.id),
    ...archive.map((a) => a.id),
    ...archiveMedia.map((m) => m.id),
    ...publications.map((p) => p.id),
  ]);

  const audit = can('auditLog:read')
    ? await load(
        'Histórico',
        async () => {
          const snap = await c.db
            .collection('auditLogs')
            .where('tenantId', '==', ctx.tenantId)
            .orderBy('timestamp', 'desc')
            .limit(500)
            .select('timestamp', 'acao', 'entidade', 'entidadeId', 'usuarioId')
            .get();
          const relevant = snap.docs
            .filter((doc) => relatedIds.has(String(doc.get('entidadeId'))))
            .slice(0, 40);
          const actorIds = [...new Set(relevant.map((doc) => String(doc.get('usuarioId'))))];
          const actors = new Map(
            await Promise.all(
              actorIds.map(async (id) => {
                if (id === 'self-claim') return [id, 'Autoatendimento'] as const;
                const user = await c.repositories.user.findById(id);
                if (!user || user.tenantId !== ctx.tenantId)
                  return [id, 'Responsável não identificado'] as const;
                const member = user.memberId
                  ? await c.repositories.member.findById(user.memberId)
                  : null;
                return [
                  id,
                  member?.tenantId === ctx.tenantId ? member.nomeCompleto : user.email,
                ] as const;
              }),
            ),
          );
          return relevant.map((doc) => {
            const action = String(doc.get('acao'));
            const collection = String(doc.get('entidade'));
            return {
              id: doc.id,
              at: doc.get('timestamp').toDate() as Date,
              action: (AUDIT_ACTION_LABELS as Record<string, string>)[action] ?? action,
              entity:
                collection === 'events'
                  ? 'Acontecimento'
                  : AUDIT_ENTITY_LABELS[collection] ?? collection,
              entityId: String(doc.get('entidadeId')),
              actor: actors.get(String(doc.get('usuarioId'))) ?? 'Responsável',
            };
          });
        },
        [],
      )
    : [];

  const newsReady = can('news:read') && !errors.includes('Notícias');
  const announcementsReady = can('announcement:read') && !errors.includes('Avisos');
  const hasCommunication = relatedNews.length > 0 || relatedAnnouncements.length > 0 || publications.length > 0;
  const constellationEligible = publishedArchiveCount > 0 && publishedVisual.length > 0;

  const health = [
    {
      label: 'Dados do acontecimento',
      ok: Boolean(event.titulo && event.local && event.dataInicio),
      detail: 'Título, data e local',
    },
    {
      label: 'Gestão correspondente',
      ok: Boolean(management),
      detail: management?.nome ?? 'Nenhuma gestão encontrada para a data',
    },
    {
      label: 'Comunicação',
      ok: hasCommunication,
      detail: hasCommunication
        ? `${relatedNews.length} notícia(s), ${relatedAnnouncements.length} aviso(s), ${publications.length} arte(s)`
        : 'Nenhuma comunicação vinculada',
    },
    {
      label: 'Memória visual',
      ok: publishedVisual.length > 0,
      detail: `${photoCount} foto(s) e ${videoCount} vídeo(s)`,
    },
    {
      label: 'Acervo publicado',
      ok: publishedArchiveCount > 0,
      detail: `${publishedArchiveCount} item(ns) publicado(s)`,
    },
    {
      label: 'Constelação',
      ok: constellationEligible,
      detail: constellationEligible ? 'Elegível para memória automática' : 'Ainda não elegível',
    },
  ];
  const healthScore = Math.round((health.filter((item) => item.ok).length / health.length) * 100);
  const overallState = healthScore >= 85 ? 'Completo' : healthScore >= 55 ? 'Requer atenção' : 'Em construção';

  const option = {
    id: event.id,
    titulo: event.titulo,
    dataInicio: event.dataInicio.toISOString(),
    local: event.local,
    tipo: event.tipo,
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Link href="/admin/publicacoes" className="text-sm underline">
        ← Todos os acontecimentos
      </Link>

      <header className="border-border bg-surface overflow-hidden rounded-3xl border shadow-sm">
        <div className="bg-primary px-6 py-7 text-white md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
                Ficha Única do Acontecimento
              </p>
              <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">{event.titulo}</h1>
              <p className="mt-3 text-sm text-white/80 md:text-base">
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'long',
                  timeZone: 'America/Sao_Paulo',
                }).format(event.dataInicio)}{' '}
                · {event.local}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-white/15 px-3 py-1.5">{overallState}</span>
                {management && <span className="rounded-full bg-white/15 px-3 py-1.5">{management.nome}</span>}
                {entity && (
                  <span className="rounded-full bg-white/15 px-3 py-1.5">
                    {entity.unitNumber ? `${entity.shortName} nº ${entity.unitNumber}` : entity.shortName}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-[190px] rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/65">Integridade da ficha</p>
              <p className="mt-1 text-4xl font-semibold">{healthScore}%</p>
              <p className="mt-1 text-sm text-white/75">{health.filter((item) => item.ok).length} de {health.length} etapas prontas</p>
            </div>
          </div>
        </div>
        <nav aria-label="Seções da ficha" className="flex gap-2 overflow-x-auto border-t border-white/10 bg-surface px-4 py-3 md:px-6">
          {[
            ['#visao-geral', 'Visão geral'],
            ['#dados', 'Dados'],
            ['#comunicacao', 'Comunicação'],
            ['#memoria', 'Memória e Acervo'],
            ['#relacionamentos', 'Relacionamentos'],
            ['#historico', 'Histórico'],
            ['#acoes', 'Ações'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="border-border hover:border-accent whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium">
              {label}
            </a>
          ))}
        </nav>
      </header>

      {errors.length > 0 && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Não foi possível carregar: {errors.join(', ')}. Os demais dados continuam disponíveis e nenhuma informação foi apagada.
        </p>
      )}

      <section id="visao-geral" className="scroll-mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="border-border bg-surface rounded-2xl border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">Fluxo único</p>
              <h2 className="font-display mt-1 text-2xl font-semibold">Situação do acontecimento</h2>
            </div>
            <Link href="#dados" className="text-sm font-semibold underline">Editar dados</Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((item) => (
              <div key={item.label} className={`rounded-xl border p-4 ${statusClass(item.ok ? 'ok' : 'attention')}`}>
                <p className="font-semibold">{item.ok ? '✓ ' : '⚠ '}{item.label}</p>
                <p className="mt-1 text-xs opacity-80">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="border-border mt-6 grid gap-3 border-t pt-5 md:grid-cols-5">
            {[
              ['1', 'Acontecimento', true],
              ['2', 'Comunicação', hasCommunication],
              ['3', 'Mídias', archiveMedia.length > 0],
              ['4', 'Acervo', publishedArchiveCount > 0],
              ['5', 'Memória', constellationEligible],
            ].map(([step, label, ok]) => (
              <a key={String(step)} href={step === '1' ? '#dados' : step === '2' ? '#comunicacao' : '#memoria'} className="group rounded-xl border border-transparent p-2 hover:border-border">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{step}</span>
                <p className="mt-2 text-sm font-semibold">{label}</p>
              </a>
            ))}
          </div>
        </div>

        <aside className="border-border bg-surface rounded-2xl border p-6">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">Resumo operacional</p>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Notícias</dt><dd className="font-semibold">{relatedNews.length}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Avisos</dt><dd className="font-semibold">{relatedAnnouncements.length}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Fotos</dt><dd className="font-semibold">{photoCount}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Vídeos</dt><dd className="font-semibold">{videoCount}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Documentos</dt><dd className="font-semibold">{documentCount}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-muted">Pessoas identificadas</dt><dd className="font-semibold">{identifiedPeople.size}</dd></div>
          </dl>
          <div className="mt-6 grid gap-2">
            <a href="#comunicacao" className="bg-primary rounded-xl px-4 py-3 text-center text-sm font-semibold text-white">Continuar comunicação</a>
            <a href="#memoria" className="border-border rounded-xl border px-4 py-3 text-center text-sm font-semibold">Gerir fotos e vídeos</a>
          </div>
        </aside>
      </section>

      <section id="dados" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Fonte principal</p>
            <h2 className="font-display mt-1 text-2xl font-semibold">Dados do acontecimento</h2>
            <p className="text-muted mt-2 text-sm">Título, data, local, classificação e anexos são mantidos aqui e servem de referência para as demais áreas.</p>
          </div>
          {management && <Link href={`/admin/pessoas/gestoes/${management.id}`} className="text-sm underline">Abrir gestão correspondente</Link>}
        </div>
        {can('event:update') ? (
          <details className="mt-5" open={healthScore < 55}>
            <summary className="cursor-pointer rounded-xl border border-border px-4 py-3 font-semibold">Editar dados e classificação</summary>
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
          <p className="text-muted mt-4">{event.descricao}</p>
        )}
      </section>

      <section id="comunicacao" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">Tudo vinculado à mesma ficha</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">Comunicação e divulgação</h2>
          <p className="text-muted mt-2 text-sm">Notícias, avisos, Instagram e artes permanecem vinculados a este acontecimento. As telas antigas continuam acessíveis apenas como manutenção avançada.</p>
        </div>

        {newsReady && (
          <div id="noticia" className="mt-6 scroll-mt-6 rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Notícias</h3><span className="text-muted text-sm">{relatedNews.length} vinculada(s)</span></div>
            {can('news:update') && (
              <div className="mt-4"><WorkspaceLinkForm eventId={eventId} kind="news" options={news.filter((n) => !n.eventId).map((n) => ({ id: n.id, title: n.titulo }))} /></div>
            )}
            <div className="mt-4 space-y-4">
              {relatedNews.map((n) => (
                <details key={n.id} open={relatedNews.length === 1} className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer font-semibold">{n.titulo} · {n.publicado ? 'Publicado' : 'Rascunho'}</summary>
                  <div className="mt-5">
                    {can('news:update') ? (
                      <WorkspaceNewsEditor event={option} news={n} photos={photos} canPublish={can('news:publish')} />
                    ) : (
                      <p className="text-muted">{n.subtitulo}</p>
                    )}
                    {can('news:update') && <WorkspaceInstagramForm eventId={eventId} news={n} />}
                    {can('news:manage') && (
                      <div className="mt-5">
                        <h4 className="mb-3 text-sm font-semibold">Comentários aguardando moderação</h4>
                        <ModerateCommentsPanel comments={comments.filter((comment) => comment.newsId === n.id)} authorNames={authorNames} />
                      </div>
                    )}
                    <Link className="mt-4 inline-block text-xs underline" href={`/admin/conteudo/noticias/${n.id}`}>Abrir manutenção avançada desta notícia</Link>
                  </div>
                </details>
              ))}
              {can('news:create') && (
                <details open={!relatedNews.length} key={`new-news-${relatedNews.length}`} className="rounded-xl border border-dashed border-border p-4">
                  <summary className="cursor-pointer font-semibold">{relatedNews.length ? 'Adicionar outra notícia' : 'Escrever notícia deste acontecimento'}</summary>
                  <div className="mt-5"><WorkspaceNewsEditor event={option} photos={photos} canPublish={false} /></div>
                </details>
              )}
            </div>
          </div>
        )}

        {announcementsReady && (
          <div id="aviso" className="mt-5 scroll-mt-6 rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Avisos</h3><span className="text-muted text-sm">{relatedAnnouncements.length} vinculado(s)</span></div>
            {can('announcement:update') && (
              <div className="mt-4"><WorkspaceLinkForm eventId={eventId} kind="announcement" options={announcements.filter((a) => !a.eventId).map((a) => ({ id: a.id, title: a.titulo }))} /></div>
            )}
            <div className="mt-4 space-y-4">
              {relatedAnnouncements.map((a) => (
                <details key={a.id} open={relatedAnnouncements.length === 1} className="rounded-xl border border-border p-4">
                  <summary className="cursor-pointer font-semibold">{a.titulo} · {a.publicado ? 'Publicado' : 'Rascunho'}</summary>
                  <div className="mt-5">
                    {can('announcement:update') ? (
                      <WorkspaceAnnouncementEditor eventId={eventId} title={event.titulo} announcement={a} canPublish={can('announcement:publish')} />
                    ) : (
                      <p className="text-muted">{a.descricao}</p>
                    )}
                    {a.publicado && can('notification:manage') && <div className="mt-5"><AnnouncementReachReportCard announcementId={a.id} /></div>}
                    <Link className="mt-4 inline-block text-xs underline" href={`/admin/conteudo/avisos/${a.id}`}>Abrir manutenção avançada deste aviso</Link>
                  </div>
                </details>
              ))}
              {can('announcement:create') && (
                <details open={!relatedAnnouncements.length} key={`new-announcement-${relatedAnnouncements.length}`} className="rounded-xl border border-dashed border-border p-4">
                  <summary className="cursor-pointer font-semibold">{relatedAnnouncements.length ? 'Adicionar outro aviso' : 'Preparar aviso deste acontecimento'}</summary>
                  <div className="mt-5"><WorkspaceAnnouncementEditor eventId={eventId} title={event.titulo} canPublish={false} /></div>
                </details>
              )}
            </div>
          </div>
        )}

        {can('communication:manage') && !errors.includes('Artes') && (
          <div id="artes" className="mt-5 scroll-mt-6 rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Artes e canais externos</h3><span className="text-muted text-sm">{publications.length} arte(s)</span></div>
            <p className="text-muted mt-2 text-sm">A distribuição externa continua manual, mas a preparação e o registro permanecem vinculados à ficha.</p>
            <div className="mt-4">
              {!publications.length && (templates.some((t) => t.active && t.type === 'session') ? (
                <WorkspaceArtForm eventId={eventId} templates={templates.filter((t) => t.active && t.type === 'session')} />
              ) : (
                <p className="text-muted text-sm">Cadastre um modelo ativo em <Link href="/admin/comunicacao/modelos" className="underline">Modelos de arte</Link>.</p>
              ))}
              {publications.map((p) => {
                const template = templates.find((t) => t.id === p.templateId && t.tenantId === ctx.tenantId);
                return template ? (
                  <details key={p.id} open className="mb-4 rounded-xl border border-border p-4">
                    <summary className="cursor-pointer font-semibold">{p.title} · {template.name}</summary>
                    <div className="mt-5"><PublicationArtGenerator publication={p} template={template} /></div>
                  </details>
                ) : (
                  <p key={p.id} role="alert" className="text-sm text-amber-700">Modelo de “{p.title}” não disponível neste painel.</p>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {can('archiveItem:read') && !errors.includes('Acervo') && (
        <section id="memoria" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">Patrimônio digital do fato</p>
              <h2 className="font-display mt-1 text-2xl font-semibold">Memória e Acervo</h2>
              <p className="text-muted mt-2 text-sm">Envie, classifique, organize, publique e reutilize fotos, vídeos e documentos sem criar registros desconectados.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{photoCount} fotos</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{videoCount} vídeos</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{documentCount} documentos</span>
              <span className={`rounded-full px-3 py-1.5 ${constellationEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{constellationEligible ? 'Constelação elegível' : 'Constelação pendente'}</span>
            </div>
          </div>
          <div className="mt-5">
            {can('archiveItem:create')
              ? (archive.length ? archive : [null]).map((a) => (
                  <details key={a?.id ?? 'new-archive'} open={archive.length <= 1} className="mb-4 rounded-xl border border-border p-4">
                    <summary className="cursor-pointer font-semibold">{a ? `${a.titulo} · ${a.publicacaoStatus}` : 'Adicionar fotos, vídeos ou documentos'}</summary>
                    <div className="mt-5">
                      <PublishWizard
                        initialEvent={event}
                        initialArchiveItemId={a?.id ?? null}
                        events={[event]}
                        drafts={archive.filter((item) => item.publicacaoStatus === 'rascunho')}
                        boardTerms={boardTerms}
                        eventPublishState={{}}
                      />
                    </div>
                  </details>
                ))
              : archive.map((a) => <p key={a.id} className="text-sm">{a.titulo} · {a.publicacaoStatus}</p>)}
          </div>
        </section>
      )}

      <section id="relacionamentos" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
        <p className="text-muted text-xs font-semibold uppercase tracking-wide">Contexto histórico</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Relacionamentos</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-muted text-xs uppercase tracking-wide">Gestão pela data</p>
            <p className="mt-2 font-semibold">{management?.nome ?? 'Não identificada'}</p>
            {management && <Link href={`/admin/pessoas/gestoes/${management.id}`} className="mt-2 inline-block text-xs underline">Abrir gestão</Link>}
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-muted text-xs uppercase tracking-wide">Entidade relacionada</p>
            <p className="mt-2 font-semibold">{entity ? (entity.unitNumber ? `${entity.shortName} nº ${entity.unitNumber}` : entity.shortName) : event.agendaContext === 'loja' ? 'Verdadeira Luz nº 06' : 'Não informada'}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-muted text-xs uppercase tracking-wide">Pessoas nas mídias</p>
            <p className="mt-2 text-2xl font-semibold">{identifiedPeople.size}</p>
            <p className="text-muted mt-1 text-xs">Identificações já registradas no Acervo</p>
          </div>
        </div>
      </section>

      {can('auditLog:read') && (
        <section id="historico" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">Rastreabilidade</p>
              <h2 className="font-display mt-1 text-2xl font-semibold">Histórico administrativo</h2>
              <p className="text-muted mt-2 text-sm">Exibe as ações mais recentes encontradas na auditoria para o acontecimento e seus registros relacionados.</p>
            </div>
            <Link href="/admin/configuracoes/auditoria" className="text-sm underline">Auditoria completa</Link>
          </div>
          {audit.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-muted border-b border-border text-xs uppercase tracking-wide"><tr><th className="px-3 py-2">Quando</th><th className="px-3 py-2">Ação</th><th className="px-3 py-2">Registro</th><th className="px-3 py-2">Responsável</th></tr></thead>
                <tbody>
                  {audit.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-3 whitespace-nowrap">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(item.at)}</td>
                      <td className="px-3 py-3 font-semibold">{item.action}</td>
                      <td className="px-3 py-3"><span>{item.entity}</span><span className="text-muted ml-2 font-mono text-xs">{item.entityId.slice(0, 10)}</span></td>
                      <td className="px-3 py-3">{item.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted mt-5 rounded-xl border border-dashed border-border p-5 text-sm">Nenhuma ação relacionada foi encontrada entre os registros recentes consultados.</p>
          )}
        </section>
      )}

      <section id="acoes" className="border-border bg-surface scroll-mt-6 rounded-2xl border p-6">
        <p className="text-muted text-xs font-semibold uppercase tracking-wide">Ciclo de vida</p>
        <h2 className="font-display mt-1 text-2xl font-semibold">Ações e exclusão segura</h2>
        <p className="text-muted mt-2 max-w-3xl text-sm">A exclusão operacional do acontecimento é tratada como retirada/arquivamento do registro principal. Notícias, avisos, mídias e documentos relacionados não são apagados automaticamente, evitando perda em cascata.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl border border-border p-5">
            <h3 className="font-semibold">Análise de impacto</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ['Notícias', relatedNews.length],
                ['Avisos', relatedAnnouncements.length],
                ['Itens do Acervo', archive.length],
                ['Fotos', photoCount],
                ['Vídeos', videoCount],
                ['Documentos', documentCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><p className="text-muted text-xs">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
            <h3 className="font-semibold">Arquivar acontecimento</h3>
            <p className="mt-2 text-sm">Use somente quando o fato foi cadastrado por engano ou não deve mais aparecer na operação. Os conteúdos vinculados permanecem preservados para revisão administrativa.</p>
            <form action={archiveEventRecordAction.bind(null, eventId)} className="mt-4 space-y-4">
              <label className="flex items-start gap-3 text-sm"><input required name="confirm" type="checkbox" className="mt-1" /><span>Confirmo que revisei o impacto acima e quero retirar este acontecimento da operação.</span></label>
              <button type="submit" className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800">Arquivar acontecimento</button>
            </form>
          </div>
        </div>
      </section>

      <section className="border-border bg-surface rounded-2xl border p-6">
        <details>
          <summary className="cursor-pointer font-semibold">Administração avançada</summary>
          <p className="text-muted mt-3 text-sm">Acesse telas especializadas somente quando precisar de manutenção que não pertence ao fluxo cotidiano da Ficha Única.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/admin/conteudo/agenda" className="rounded-lg border border-border px-3 py-2">Agenda técnica</Link>
            <Link href="/admin/conteudo/noticias" className="rounded-lg border border-border px-3 py-2">Todas as notícias</Link>
            <Link href="/admin/conteudo/avisos" className="rounded-lg border border-border px-3 py-2">Todos os avisos</Link>
            <Link href="/admin/acervo/publicar" className="rounded-lg border border-border px-3 py-2">Publicação do Acervo</Link>
            <Link href="/admin/acervo/catalogacao" className="rounded-lg border border-border px-3 py-2">Catalogação</Link>
            <Link href="/admin/comunicacao" className="rounded-lg border border-border px-3 py-2">Comunicação</Link>
          </div>
        </details>
      </section>
    </div>
  );
}
