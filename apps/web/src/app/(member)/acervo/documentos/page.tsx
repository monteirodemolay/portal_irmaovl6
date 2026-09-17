import type { ReactNode } from 'react';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { BoardTerm } from '@vl6/domain';
import { Card, CardContent, EmptyState, FileText, Image as ImageIcon, Video } from '@vl6/ui';
import type { MediaViewerItemKind } from '@vl6/ui';
import type { FileKind } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';
import { DocumentGrid, type DocumentGridItem } from '@/modules/archive/components/document-grid';
import { loadPublishedArchiveDocuments } from '@/modules/archive/lib/load-published-archive-events';

function buildHref(params: { categoria?: string; gestao?: string }): string {
  const query = new URLSearchParams();
  if (params.categoria) query.set('categoria', params.categoria);
  if (params.gestao) query.set('gestao', params.gestao);
  const qs = query.toString();
  return qs ? `/acervo/documentos?${qs}` : '/acervo/documentos';
}

/**
 * Gestão vigente numa data, buscada em memória entre todas as Gestões do
 * tenant — mesmo critério de `FindBoardTermForDateUseCase`
 * (`periodoInicio <= data <= periodoFim`), só que resolvido localmente pra
 * agrupar a lista inteira de documentos de uma vez, sem uma consulta por
 * documento.
 */
function findGestaoForDate(gestoes: BoardTerm[], date: Date): BoardTerm | null {
  return gestoes.find((g) => date >= g.periodoInicio && date <= g.periodoFim) ?? null;
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="font-display text-2xl font-semibold">{value}</span>
        <span className="text-muted text-xs">{label}</span>
      </CardContent>
    </Card>
  );
}

function SidebarLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'bg-primary flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-white'
          : 'text-muted hover:bg-background hover:text-foreground flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors'
      }
    >
      <span className="truncate">{label}</span>
      <span className="text-xs opacity-70">{count}</span>
    </Link>
  );
}

export default async function ArchiveDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; gestao?: string }>;
}) {
  const session = await requirePagePermission('file:read');
  const params = await searchParams;

  const container = createServerContainer();
  const [filesPage, categories, libraryItems, archiveDocuments, gestoes] = await Promise.all([
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.useCases.listFileCategories.execute(session.authContext),
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    loadPublishedArchiveDocuments(container, session.authContext, session.role),
    container.useCases.listBoardTerms.execute(session.authContext),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));
  const libraryFileIds = new Set(
    libraryItems.map((item) => item.fileId).filter((id): id is string => Boolean(id)),
  );

  const allDocuments = filesPage.items.filter(
    (file) => file.publicado && !libraryFileIds.has(file.id),
  );

  // Cada documento (legado, sem vínculo direto de Gestão) recebe a Gestão
  // inferida pela data de publicação — mesmo critério documentado no
  // levantamento institucional: "agrupamento por Gestão inferida por data
  // pra documentos legados".
  const gestaoByDocumentId = new Map<string, BoardTerm | null>();
  for (const doc of allDocuments) {
    gestaoByDocumentId.set(doc.id, findGestaoForDate(gestoes, doc.dataPublicacao ?? doc.createdAt));
  }

  const documents = allDocuments
    .filter((file) => !params.categoria || file.categoriaId === params.categoria)
    .filter((file) => !params.gestao || gestaoByDocumentId.get(file.id)?.id === params.gestao);

  // Categoria "Evento" é sintética — documentos publicados pela Central de
  // Publicação não têm `FileCategory` própria (o modelo de dados nem tem
  // esse campo), então nunca aparecem escondidos atrás de um filtro que
  // não corresponde a eles. Também não entram no agrupamento por Gestão:
  // já vivem dentro do Evento que as originou.
  const showArchiveDocuments = !params.categoria && !params.gestao;
  const visibleArchiveDocuments = showArchiveDocuments ? archiveDocuments : [];

  const thisYear = new Date().getFullYear();
  const documentsThisYear = allDocuments.filter(
    (doc) => (doc.dataPublicacao ?? doc.createdAt).getFullYear() === thisYear,
  ).length;
  const gestoesRepresentadas = new Set(
    [...gestaoByDocumentId.values()].filter((g): g is BoardTerm => g !== null).map((g) => g.id),
  ).size;

  const categoryCounts = new Map<string, number>();
  for (const doc of allDocuments) {
    categoryCounts.set(doc.categoriaId, (categoryCounts.get(doc.categoriaId) ?? 0) + 1);
  }
  const gestaoCounts = new Map<string, number>();
  for (const gestao of gestaoByDocumentId.values()) {
    if (gestao) gestaoCounts.set(gestao.id, (gestaoCounts.get(gestao.id) ?? 0) + 1);
  }

  function toGridItem(file: (typeof documents)[number]): DocumentGridItem {
    return {
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
    };
  }

  // Grupos por Gestão, mais recente primeiro; documentos sem Gestão
  // identificável (fora de qualquer `periodoInicio`/`periodoFim`
  // cadastrado) ficam num grupo à parte, ao final.
  const sortedGestoes = [...gestoes].sort(
    (a, b) => b.periodoInicio.getTime() - a.periodoInicio.getTime(),
  );
  const groups: { key: string; label: string; items: DocumentGridItem[] }[] = [];
  for (const gestao of sortedGestoes) {
    const items = documents.filter((doc) => gestaoByDocumentId.get(doc.id)?.id === gestao.id);
    if (items.length > 0)
      groups.push({ key: gestao.id, label: gestao.nome, items: items.map(toGridItem) });
  }
  const semGestao = documents.filter((doc) => !gestaoByDocumentId.get(doc.id));
  if (semGestao.length > 0) {
    groups.push({
      key: 'sem-gestao',
      label: 'Sem Gestão identificada',
      items: semGestao.map(toGridItem),
    });
  }

  const hasResults = groups.length > 0 || visibleArchiveDocuments.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Documentos" backHref="/acervo" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Documentos" value={allDocuments.length + archiveDocuments.length} />
        <StatCard label={`Publicados em ${thisYear}`} value={documentsThisYear} />
        <StatCard label="Categorias" value={categories.length} />
        <StatCard label="Gestões representadas" value={gestoesRepresentadas} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-5">
          <div>
            <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
              Categoria
            </h2>
            <div className="flex flex-col gap-0.5">
              <SidebarLink
                href={buildHref({ gestao: params.gestao })}
                label="Todas"
                count={allDocuments.length}
                active={!params.categoria}
              />
              {categories.map((category) => (
                <SidebarLink
                  key={category.id}
                  href={buildHref({
                    categoria: params.categoria === category.id ? undefined : category.id,
                    gestao: params.gestao,
                  })}
                  label={category.nome}
                  count={categoryCounts.get(category.id) ?? 0}
                  active={params.categoria === category.id}
                />
              ))}
            </div>
          </div>

          {sortedGestoes.length > 0 && (
            <div>
              <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                Gestão
              </h2>
              <div className="flex flex-col gap-0.5">
                <SidebarLink
                  href={buildHref({ categoria: params.categoria })}
                  label="Todas"
                  count={allDocuments.length}
                  active={!params.gestao}
                />
                {sortedGestoes
                  .filter((g) => (gestaoCounts.get(g.id) ?? 0) > 0)
                  .map((gestao) => (
                    <SidebarLink
                      key={gestao.id}
                      href={buildHref({
                        categoria: params.categoria,
                        gestao: params.gestao === gestao.id ? undefined : gestao.id,
                      })}
                      label={gestao.nome}
                      count={gestaoCounts.get(gestao.id) ?? 0}
                      active={params.gestao === gestao.id}
                    />
                  ))}
              </div>
            </div>
          )}
        </aside>

        <div className="flex flex-col gap-8">
          {!hasResults ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="Nenhum documento publicado ainda"
              description="Atas autorizadas, circulares e registros institucionais aparecerão aqui assim que forem publicados."
            />
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.key} className="flex flex-col gap-3">
                  <h2 className="font-display text-lg font-semibold">
                    {group.label}
                    <span className="text-muted ml-2 text-sm font-normal">
                      {group.items.length} {group.items.length === 1 ? 'documento' : 'documentos'}
                    </span>
                  </h2>
                  <DocumentGrid items={group.items} />
                </div>
              ))}

              {visibleArchiveDocuments.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="font-display text-lg font-semibold">Publicados via Evento</h2>
                  <DocumentGrid
                    items={visibleArchiveDocuments.map((doc): DocumentGridItem => ({
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
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
