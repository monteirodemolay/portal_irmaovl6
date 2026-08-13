import { createServerContainer } from '@vl6/infra';
import type { FileAsset, FileCategory } from '@vl6/domain';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { FILE_KIND_LABELS } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { RecordingLink } from '@/components/member/recording-link';

export default async function MemberFilesPage() {
  const session = await requirePagePermission('file:read');

  const container = createServerContainer();
  const categories = await container.useCases.listFileCategories.execute(session.authContext);
  const filesByCategory = await Promise.all(
    categories.map((category) =>
      container.useCases.listPublishedFilesByCategory
        .execute(session.authContext, category.id, { limit: 100 })
        .then((page) => [category, page.items] as [FileCategory, FileAsset[]]),
    ),
  );
  const nonEmptyCategories = filesByCategory.filter(([, files]) => files.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Arquivos</h1>

      {nonEmptyCategories.length === 0 ? (
        <EmptyState title="Nenhum arquivo publicado ainda" />
      ) : (
        nonEmptyCategories.map(([category, files]) => (
          <div key={category.id} className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">{category.nome}</h2>
            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <Card key={file.id}>
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle>{file.titulo}</CardTitle>
                    <Badge variant="outline">{FILE_KIND_LABELS[file.tipo]}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {file.descricao && <p className="text-muted text-sm">{file.descricao}</p>}
                    <div className="flex gap-4 text-sm">
                      <RecordingLink href={`/api/files/${file.id}`} label="Visualizar" />
                      {file.permitirDownload && (
                        <RecordingLink
                          href={`/api/files/${file.id}?mode=download`}
                          label="Baixar"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
