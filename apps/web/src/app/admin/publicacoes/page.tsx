import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { PUBLICATION_STATUS_LABELS } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import {
  PublicationCenter,
  type EditorialItem,
} from '@/modules/admin/components/publication-center';
import { EditorialNav } from '@/components/layout/editorial-nav';
export const metadata = { title: 'Publicações e Agenda · Central de Administração VL6' };
export const dynamic = 'force-dynamic';

export default async function PublicationsPage() {
  const session = await requireSession(),
    ctx = session.authContext;
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(ctx, permission);
  if (
    ![
      'event:read',
      'announcement:read',
      'news:read',
      'communication:manage',
      'archiveItem:create',
    ].some((p) => can(p as Parameters<typeof can>[0]))
  )
    notFound();
  const c = createServerContainer(),
    errors: string[] = [],
    items: EditorialItem[] = [];
  const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
  const safe = async (label: string, load: () => Promise<void>) => {
    try {
      await load();
    } catch {
      errors.push(label);
    }
  };
  await Promise.all([
    can('event:read')
      ? safe('Agenda', async () => {
          const result = await c.useCases.listAllEvents.execute(ctx, { limit: 100 });
          for (const e of result.items)
            items.push({
              id: `event:${e.id}`,
              title: e.titulo,
              type: 'Acontecimento',
              status: 'Cadastrado',
              href: `/admin/conteudo/agenda/${e.id}`,
              eventId: e.id,
              happenedAt: iso(e.dataInicio),
              publishedAt: null,
              scheduledAt: null,
              expiresAt: null,
              destination: 'Agenda do Portal',
            });
        })
      : null,
    can('announcement:read')
      ? safe('Avisos', async () => {
          const result = await c.useCases.listAllActiveAnnouncements.execute(ctx);
          for (const a of result)
            items.push({
              id: `announcement:${a.id}`,
              title: a.titulo,
              type: 'Aviso',
              status: a.publicado ? 'Publicado no Portal' : 'Rascunho',
              href: `/admin/conteudo/avisos/${a.id}`,
              eventId: null,
              happenedAt: null,
              publishedAt: a.publicado ? iso(a.dataPublicacao) : null,
              scheduledAt: null,
              expiresAt: iso(a.dataExpiracao),
              destination: 'Avisos do Portal',
            });
        })
      : null,
    can('news:read')
      ? safe('Notícias', async () => {
          const result = await c.useCases.listAllNews.execute(ctx, { limit: 100 });
          for (const n of result.items)
            items.push({
              id: `news:${n.id}`,
              title: n.titulo,
              type: 'Notícia',
              status: n.publicado ? 'Publicado no Portal' : 'Rascunho',
              href: `/admin/conteudo/noticias/${n.id}`,
              eventId: can('event:read') ? (n.eventId ?? null) : null,
              happenedAt: null,
              publishedAt: n.publicado ? iso(n.dataPublicacao) : null,
              scheduledAt: null,
              expiresAt: null,
              destination: 'Notícias do Portal',
            });
        })
      : null,
    can('communication:manage')
      ? safe('Comunicação', async () => {
          const result = await c.useCases.listPublications.execute(ctx, null);
          for (const p of result)
            items.push({
              id: `communication:${p.id}`,
              title: p.title,
              type: 'Arte e comunicação',
              status:
                p.publicacaoStatus === 'published'
                  ? 'Distribuição registrada manualmente'
                  : PUBLICATION_STATUS_LABELS[p.publicacaoStatus],
              href: `/admin/comunicacao/publicacoes/${p.id}`,
              eventId: can('event:read') && p.sourceType === 'agenda_event' ? p.sourceId : null,
              happenedAt: null,
              publishedAt: iso(p.publishedAt),
              scheduledAt: iso(p.scheduledFor),
              expiresAt: null,
              destination: 'Distribuição externa manual',
            });
        })
      : null,
    can('archiveItem:create')
      ? safe('Acervo', async () => {
          const result = await c.repositories.archiveItem.findByTenant(ctx.tenantId, {
            limit: 100,
          });
          for (const a of result.items)
            items.push({
              id: `archive:${a.id}`,
              title: a.titulo,
              type: 'Acervo',
              status: a.publicacaoStatus,
              href: '/admin/acervo/publicar',
              eventId: can('event:read') ? a.eventId : null,
              happenedAt: null,
              publishedAt: null,
              scheduledAt: iso(a.publicarEm),
              expiresAt: null,
              destination: 'Acervo do Portal',
            });
        })
      : null,
  ]);
  const events = new Map(
    items.filter((i) => i.type === 'Acontecimento').map((i) => [i.eventId, i.happenedAt]),
  );
  for (const item of items)
    if (item.eventId) item.happenedAt = events.get(item.eventId) ?? item.happenedAt;
  items.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  const createLinks = [
    {
      href: '/admin/conteudo/agenda/novo',
      label: 'Sessão ou evento',
      permission: 'event:create' as const,
    },
    {
      href: '/admin/conteudo/avisos/novo',
      label: 'Aviso',
      permission: 'announcement:create' as const,
    },
    { href: '/admin/conteudo/noticias/nova', label: 'Notícia', permission: 'news:create' as const },
    {
      href: '/admin/acervo/publicar',
      label: 'Fotos, vídeos e documentos do Acervo',
      permission: 'archiveItem:create' as const,
    },
    {
      href: '/admin/comunicacao/modelos',
      label: 'Arte a partir de modelo',
      permission: 'communication:manage' as const,
    },
    {
      href: '/admin/conteudo/notificacoes/nova',
      label: 'Notificação pessoal',
      permission: 'notification:manage' as const,
    },
    { href: '/admin/conteudo/frases/nova', label: 'Frase', permission: 'quote:create' as const },
    { href: '/admin/conteudo/links/novo', label: 'Link útil', permission: 'link:create' as const },
  ]
    .filter((l) => can(l.permission))
    .map(({ href, label }) => ({ href, label }));
  return (
    <div className="space-y-6">
      <EditorialNav authContext={ctx} role={session.role} />
      <PublicationCenter items={items} createLinks={createLinks} errors={errors} />
    </div>
  );
}
