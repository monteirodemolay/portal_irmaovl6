import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  LinksUteisView,
  type LinksUteisItem,
} from '@/modules/notification/components/links-uteis-view';

export default async function UsefulLinksPage() {
  const session = await requirePagePermission('link:read');
  const container = createServerContainer();

  const [links, favorites] = await Promise.all([
    container.useCases.listActiveLinks.execute(session.authContext),
    container.useCases.listMyLinkFavorites.execute(session.authContext),
  ]);
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

  return <LinksUteisView links={items} />;
}
