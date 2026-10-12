import { type NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { isAdminPathAllowed, isAdminTier } from '@/lib/auth/is-admin-tier';
import {
  filterByTitle,
  MIN_RECORD_QUERY,
  type AdminSearchHit,
} from '@/modules/admin/lib/admin-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECENT_WINDOW = 100;

/**
 * Busca de registros para a janela Ctrl+K da Administração. Cada fonte só é
 * consultada se a sessão tem a permissão de leitura E o caminho administrativo
 * de destino liberado; nada vindo do navegador define o tenant.
 *
 * Irmãos: busca por nome em todo o cadastro. Acontecimentos e notícias: entre
 * os 100 mais recentes (as telas de Acontecimentos têm filtros completos).
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
          container.repositories.event.listAll(tenantId, { limit: RECENT_WINDOW }),
        )
      : null,
    allowed('news:read', '/admin/publicacoes')
      ? safe('Notícias', () =>
          container.repositories.news.listAll(tenantId, { limit: RECENT_WINDOW }),
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

  return NextResponse.json({ hits, partial: failed }, { headers });
}
