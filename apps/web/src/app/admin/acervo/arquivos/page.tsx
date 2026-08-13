import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { FileAsset } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { FILE_KIND_LABELS } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { SoftDeleteButton } from '@/components/admin/soft-delete-button';
import {
  softDeleteFileAssetAction,
  toggleFileAssetPublishedAction,
} from '@/modules/document-management/actions/document-management-actions';
import { CreateFileCategoryDialog } from '@/modules/document-management/components/create-file-category-dialog';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default async function FilesPage() {
  const session = await requirePagePermission('file:read');

  const container = createServerContainer();
  const [categories, page] = await Promise.all([
    container.useCases.listFileCategories.execute(session.authContext),
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 50 }),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));

  const columns: DataTableColumn<FileAsset>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (f) => <span className="font-medium">{f.titulo}</span>,
    },
    {
      key: 'categoria',
      header: 'Categoria',
      cell: (f) => categoryNameById.get(f.categoriaId) ?? '—',
    },
    { key: 'tipo', header: 'Tipo', cell: (f) => FILE_KIND_LABELS[f.tipo] },
    { key: 'tamanho', header: 'Tamanho', cell: (f) => formatBytes(f.tamanhoBytes) },
    {
      key: 'status',
      header: 'Status',
      cell: (f) => (
        <Badge variant={f.publicado ? 'success' : 'outline'}>
          {f.publicado ? 'publicado' : 'rascunho'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (f) => (
        <div className="flex items-center gap-2">
          <PublishToggleButton
            published={f.publicado}
            onToggle={toggleFileAssetPublishedAction.bind(null, f.id)}
          />
          <SoftDeleteButton
            triggerLabel="Excluir"
            title={`Excluir "${f.titulo}"?`}
            description="O arquivo é arquivado (soft delete) e some das listagens — o histórico permanece intacto."
            onDelete={softDeleteFileAssetAction.bind(null, f.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Arquivos</h1>
        <div className="flex gap-2">
          <CreateFileCategoryDialog />
          <Button asChild>
            <Link href="/admin/acervo/arquivos/novo">Novo Arquivo</Link>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(f) => f.id}
        emptyState={
          <EmptyState
            title="Nenhum arquivo cadastrado"
            action={
              <Button asChild size="sm">
                <Link href="/admin/acervo/arquivos/novo">Novo Arquivo</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
