import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { FILE_KIND_LABELS } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { RecordingLink } from '@/components/member/recording-link';
import { FavoriteButton } from '@/modules/library/components/favorite-button';
import {
  recordLibraryDownloadAction,
  recordLibraryViewAction,
} from '@/modules/library/actions/library-actions';

export default async function DownloadsPage() {
  const session = await requirePagePermission('libraryItem:read');

  const container = createServerContainer();
  const favorites = await container.useCases.listMyFavorites.execute(session.authContext);
  const items = await Promise.all(
    favorites.map((favorite) =>
      container.repositories.libraryItem.findById(favorite.libraryItemId),
    ),
  );
  const files = await Promise.all(
    items.map((item) => (item ? container.repositories.fileAsset.findById(item.fileId) : null)),
  );

  const rows = items
    .map((item, index) => ({ item, file: files[index] }))
    .filter(
      (row): row is { item: NonNullable<typeof row.item>; file: NonNullable<typeof row.file> } =>
        Boolean(row.item && row.file),
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Downloads</h1>
        <p className="text-muted text-sm">Seus itens favoritados na Biblioteca.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Você ainda não favoritou nenhum item da Biblioteca" />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ item, file }) => (
            <Card key={item.id}>
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
                <FavoriteButton libraryItemId={item.id} favorited />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
