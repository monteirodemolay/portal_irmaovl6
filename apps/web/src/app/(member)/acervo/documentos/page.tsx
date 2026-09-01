import type { ReactNode } from 'react';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, FileText, FilterBar, Image as ImageIcon, Video } from '@vl6/ui';
import type { MediaViewerItemKind } from '@vl6/ui';
import type { FileKind } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';
import { DocumentGrid, type DocumentGridItem } from '@/modules/archive/components/document-grid';
import { loadPublishedArchiveDocuments } from '@/modules/archive/lib/load-published-archive-events';

function buildHref(categoriaId?: string): string {
  return categoriaId ? `/acervo/documentos?categoria=${categoriaId}` : '/acervo/documentos';
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

export default async function ArchiveDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await requirePagePermission('file:read');
  const params = await searchParams;

  const container = createServerContainer();
  const [filesPage, categories, libraryItems, archiveDocuments] = await Promise.all([
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.useCases.listFileCategories.execute(session.authContext),
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    loadPublishedArchiveDocuments(container, session.authContext, session.role),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));
  const libraryFileIds = new Set(libraryItems.map((item) => item.fileId));

  const documents = filesPage.items
    .filter((file) => file.publicado && !libraryFileIds.has(file.id))
    .filter((file) => !params.categoria || file.categoriaId === params.categoria);

  // Categoria "Evento" é sintética — documentos publicados pela Central de
  // Publicação não têm `FileCategory` própria (o modelo de dados nem tem
  // esse campo), então nunca aparecem escondidos atrás de um filtro que
  // não corresponde a eles.
  const showArchiveDocuments = !params.categoria || params.categoria === 'evento';
  const visibleArchiveDocuments = showArchiveDocuments ? archiveDocuments : [];

  const filterItems = [
    ...categories.map((category) => ({
      value: category.id,
      label: category.nome,
      href: buildHref(params.categoria === category.id ? undefined : category.id),
    })),
    ...(archiveDocuments.length > 0
      ? [
          {
            value: 'evento',
            label: 'Evento',
            href: buildHref(params.categoria === 'evento' ? undefined : 'evento'),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Documentos" backHref="/acervo" />

      {filterItems.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.categoria}
          ariaLabel="Filtrar por categoria"
          linkComponent={Link}
        />
      )}

      {documents.length === 0 && visibleArchiveDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="Nenhum documento publicado ainda"
          description="Atas autorizadas, circulares e registros institucionais aparecerão aqui assim que forem publicados."
        />
      ) : (
        <DocumentGrid
          items={[
            ...documents.map((file): DocumentGridItem => ({
              id: file.id,
              href: archiveItemHref('file', file.id),
              kindLabel: categoryNameById.get(file.categoriaId) ?? 'Documento',
              icon: ICON_BY_FILE_KIND[file.tipo],
              titulo: file.titulo,
              descricao: file.descricao,
              thumbnailUrl: file.urlMiniatura,
              viewer: {
                kind: VIEWER_KIND_BY_FILE_KIND[file.tipo],
                src: `/api/files/${file.id}`,
                title: file.titulo,
                caption: file.descricao,
                externalHref: `/api/files/${file.id}`,
                downloadHref: file.permitirDownload ? `/api/files/${file.id}?mode=download` : null,
                downloadName: file.titulo,
              },
            })),
            ...visibleArchiveDocuments.map((doc): DocumentGridItem => ({
              id: doc.id,
              href: `/acervo/eventos/${doc.eventId}`,
              kindLabel: 'Evento',
              icon: <FileText size={14} />,
              titulo: doc.titulo,
              descricao: doc.eventTitulo,
              thumbnailUrl: null,
              viewer: {
                kind: doc.mimeType === 'application/pdf' ? 'pdf' : 'outro',
                src: doc.src,
                title: doc.titulo,
                caption: doc.caption,
                externalHref: `/acervo/eventos/${doc.eventId}`,
                downloadHref: doc.allowDownload ? doc.src : null,
                downloadName: doc.titulo,
              },
            })),
          ]}
        />
      )}
    </div>
  );
}
