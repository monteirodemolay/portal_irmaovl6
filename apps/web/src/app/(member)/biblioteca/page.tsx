import { createServerContainer } from '@vl6/infra';
import type { FileAsset, LibraryCategory, LibraryItem } from '@vl6/domain';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { FILE_KIND_LABELS } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { RecordingLink } from '@/components/member/recording-link';
import { FavoriteButton } from '@/modules/library/components/favorite-button';
import {
  recordLibraryDownloadAction,
  recordLibraryViewAction,
} from '@/modules/library/actions/library-actions';

export default async function LibraryPage() {
  const session = await requirePagePermission('libraryItem:read');

  const container = createServerContainer();
  const [categories, filesPage, favorites] = await Promise.all([
    container.useCases.listLibraryCategories.execute(session.authContext),
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.useCases.listMyFavorites.execute(session.authContext),
  ]);
  const itemsByCategory = await Promise.all(
    categories.map((category) =>
      container.useCases.listLibraryItemsByCategory
        .execute(session.authContext, category.id)
        .then((items) => [category, items] as [LibraryCategory, LibraryItem[]]),
    ),
  );
  const fileById = new Map(filesPage.items.map((f) => [f.id, f]));
  const favoritedItemIds = new Set(favorites.map((f) => f.libraryItemId));

  const nonEmptyCategories = itemsByCategory.filter(([, items]) => items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Biblioteca</h1>

      {nonEmptyCategories.length === 0 ? (
        <EmptyState title="Nenhum item disponível na Biblioteca ainda" />
      ) : (
        nonEmptyCategories.map(([category, items]) => (
          <div key={category.id} className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">{category.nome}</h2>
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const file = fileById.get(item.fileId);
                if (!file) return null;
                return (
                  <LibraryItemCard
                    key={item.id}
                    item={item}
                    file={file}
                    favorited={favoritedItemIds.has(item.id)}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function LibraryItemCard({
  item,
  file,
  favorited,
}: {
  item: LibraryItem;
  file: FileAsset;
  favorited: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>{file.titulo}</CardTitle>
        <Badge variant="outline">{FILE_KIND_LABELS[file.tipo]}</Badge>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex gap-4 text-sm">
          {item.permiteLeituraOnline && (
            <RecordingLink
              href={file.urlArquivo}
              label="Ler online"
              onRecord={recordLibraryViewAction.bind(null, item.id)}
            />
          )}
          {file.permitirDownload && (
            <RecordingLink
              href={file.urlArquivo}
              label="Baixar"
              onRecord={recordLibraryDownloadAction.bind(null, item.id)}
            />
          )}
        </div>
        <FavoriteButton libraryItemId={item.id} favorited={favorited} />
      </CardContent>
    </Card>
  );
}
