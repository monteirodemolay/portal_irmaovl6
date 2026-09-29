import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import {
  LinksUteisView,
  type LinksUteisItem,
} from '@/modules/notification/components/links-uteis-view';

export default async function UsefulLinksPage() {
  const [session, current] = await Promise.all([
    requirePagePermission('link:read'),
    getCurrentTenant(),
  ]);
  if (!current) return null;
  const container = createServerContainer();

  const [links, favorites] = await Promise.all([
    container.useCases.listActiveLinks.execute(session.authContext),
    container.useCases.listMyLinkFavorites.execute(session.authContext),
  ]);
  const heroPhoto = resolveHeroPhoto(current.tenant, 'links-uteis');
  const favoritedIds = new Set(favorites.map((favorite) => favorite.linkId));

  const items: LinksUteisItem[] = links
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((link) => ({
      id: link.id,
      titulo: link.titulo,
      url: link.url,
      descricao: link.descricao,
      categoria: link.categoria,
      tipoAcesso: link.tipoAcesso,
      destaque: link.destaque,
      favorito: favoritedIds.has(link.id),
    }));

  return (
    <LinksUteisView
      links={items}
      heroPhotoUrl={heroPhoto?.url}
      heroPhotoPosicao={heroPhoto?.posicao}
      canManageHeroPhoto={hasPermission(session.authContext, 'tenant:manage')}
    />
  );
}
