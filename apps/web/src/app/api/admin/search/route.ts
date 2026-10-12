import { type NextRequest, NextResponse } from 'next/server';
import { hasPermission, type Event, type News } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { createTtlCache, loadPagesUpTo } from '@/modules/admin/lib/record-index';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { isAdminPathAllowed, isAdminTier } from '@/lib/auth/is-admin-tier';
import {
  filterByTitle,
  MIN_RECORD_QUERY,
  type AdminSearchHit,
} from '@/modules/admin/lib/admin-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INDEX_CAP = 3000;
const INDEX_TTL_MS = 60_000;
const eventIndex = createTtlCache<{ items: Event[]; truncated: boolean }>(INDEX_TTL_MS);
const newsIndex = createTtlCache<{ items: News[]; truncated: boolean }>(INDEX_TTL_MS);

/**
 * Busca de registros para a janela Ctrl+K da Administração. Cada fonte só é
 * consultada se a sessão tem a permissão de leitura E o caminho administrativo
 * de destino liberado; nada vindo do navegador define o tenant.
 *
 * Irmãos: busca por nome em todo o cadastro. Acontecimentos e notícias:
 * histórico completo até `INDEX_CAP` registros por tipo (mais recentes
 * primeiro), com cache de 1 minuto por instância para não reler a cada tecla.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
  const headers = { 'Cache-Control': 'private, no-store' };
  const session = await getCurrentSession();
  if (!session || !isAdminTier(session.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers });
  }
  if (query.length < MIN_RECORD_QUERY)
    return NextResponse.json({ hits: [], partial: [] }, { headers });

  const ctx = session.authContext;
  const tenantId = ctx.tenantId;
  const container = createServerContainer();
  const allowed = (permission: Parameters<typeof hasPermission>[1], path: string) =>
    hasPermission(ctx, permission) && isAdminPathAllowed(session.role, path);
  const failed: string[] = [];
  const safe = async <T>(label: string, load: () => Promise<T>): Promise<T | null> => {
    try {
      return await load();
    } catch {
      failed.push(label);
      return null;
    }
  };

  const [members, events, news] = await Promise.all([
    allowed('member:read', '/admin/pessoas/irmaos')
      ? safe('Irmãos', () =>
          container.repositories.member.search({ tenantId, nome: query }, { limit: 5 }),
        )
      : null,
    allowed('event:read', '/admin/publicacoes')
      ? safe('Acontecimentos', () =>
          eventIndex.get(tenantId, () =>
            loadPagesUpTo(
              (cursor) => container.repositories.event.listAll(tenantId, { limit: 100, cursor }),
              INDEX_CAP,
            ),
          ),
        )
      : null,
    allowed('news:read', '/admin/publicacoes')
      ? safe('Notícias', () =>
          newsIndex.get(tenantId, () =>
            loadPagesUpTo(
              (cursor) => container.repositories.news.listAll(tenantId, { limit: 100, cursor }),
              INDEX_CAP,
            ),
          ),
        )
      : null,
  ]);

  const hits: AdminSearchHit[] = [
    ...(members?.items ?? []).map((member) => ({
      id: `membro:${member.id}`,
      kind: 'Irmão' as const,
      title: member.nomeCompleto,
      detail: member.situacao,
      href: `/admin/pessoas/irmaos/${member.id}`,
    })),
    ...filterByTitle(events?.items ?? [], query, (event) => event.titulo).map((event) => ({
      id: `evento:${event.id}`,
      kind: 'Acontecimento' as const,
      title: event.titulo,
      detail: new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
      }).format(event.dataInicio),
      href: `/admin/publicacoes/${event.id}`,
    })),
    ...filterByTitle(news?.items ?? [], query, (item) => item.titulo).map((item) => ({
      id: `noticia:${item.id}`,
      kind: 'Notícia' as const,
      title: item.titulo,
      detail: item.publicado ? 'Publicada' : 'Rascunho',
      href: item.eventId
        ? `/admin/publicacoes/${item.eventId}`
        : `/admin/conteudo/noticias/${item.id}`,
    })),
  ];

  return NextResponse.json(
    { hits, partial: failed, truncated: Boolean(events?.truncated || news?.truncated) },
    { headers },
  );
}
