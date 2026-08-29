import type { ReactNode } from 'react';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { BookOpen, EmptyState, FileText, FilterBar, Image as ImageIcon, Video } from '@vl6/ui';
import type { MediaViewerItemKind } from '@vl6/ui';
import type { FileKind } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';
import { DocumentGrid, type DocumentGridItem } from '@/modules/archive/components/document-grid';

function buildHref(categoriaId?: string): string {
  return categoriaId ? `/acervo/biblioteca?categoria=${categoriaId}` : '/acervo/biblioteca';
}

const VIEWER_KIND_BY_FILE_KIND: Record<FileKind, MediaViewerItemKind> = {
  imagem: 'imagem',
  video: 'video',
  pdf: 'pdf',
  word: 'outro',
  excel: 'outro',
  powerpoint: 'outro',
};

const ICON_BY_FILE_KIND: Record<FileKind, ReactNode> = {
  imagem: <ImageIcon size={14} />,
  video: <Video size={14} />,
  pdf: <FileText size={14} />,
  word: <FileText size={14} />,
  excel: <FileText size={14} />,
  powerpoint: <FileText size={14} />,
};

export default async function ArchiveLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await requirePagePermission('libraryItem:read');
  const params = await searchParams;

  const container = createServerContainer();
  const [libraryItems, categories] = await Promise.all([
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    container.useCases.listLibraryCategories.execute(session.authContext),
  ]);

  const filteredItems = libraryItems.filter(
    (item) => !params.categoria || item.categoriaId === params.categoria,
  );

  const files = await Promise.all(
    filteredItems.map((item) => container.repositories.fileAsset.findById(item.fileId)),
  );
  const fileById = new Map(filteredItems.map((item, i) => [item.id, files[i]]));
  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));

  const filterItems = categories
    .filter((c) => c.categoriaPaiId === null)
    .map((category) => ({
      value: category.id,
      label: category.nome,
      href: buildHref(params.categoria === category.id ? undefined : category.id),
    }));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Biblioteca" backHref="/acervo" />

      {filterItems.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.categoria}
          ariaLabel="Filtrar por categoria"
          linkComponent={Link}
        />
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Nenhum item catalogado ainda"
          description="Livros, estudos e leituras selecionadas para os Irmãos aparecerão aqui assim que forem catalogados."
        />
      ) : (
        <DocumentGrid
          items={filteredItems.flatMap((item): DocumentGridItem[] => {
            const file = fileById.get(item.id);
            if (!file) return [];
            return [
              {
                id: item.id,
                href: archiveItemHref('library', item.id),
                kindLabel: categoryNameById.get(item.categoriaId) ?? 'Biblioteca',
                icon: ICON_BY_FILE_KIND[file.tipo] ?? <BookOpen size={14} />,
                titulo: file.titulo,
                descricao: file.descricao,
                thumbnailUrl: file.urlMiniatura,
                viewer: {
                  kind: VIEWER_KIND_BY_FILE_KIND[file.tipo],
                  src: `/api/library-items/${item.id}`,
                  title: file.titulo,
                  caption: file.descricao,
                  externalHref: `/api/library-items/${item.id}`,
                  downloadHref: file.permitirDownload
                    ? `/api/library-items/${item.id}?mode=download`
                    : null,
                  downloadName: file.titulo,
                },
              },
            ];
          })}
        />
      )}
    </div>
  );
}
