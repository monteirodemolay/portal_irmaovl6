import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArchiveItemHeader,
  Badge,
  BookOpen,
  Download,
  FileText,
  Image as ImageIcon,
  ProvenancePanel,
} from '@vl6/ui';
import type { ArchiveItemKind } from '../lib/archive-item-id';
import type { ResolvedArchiveItem } from '../lib/resolve-archive-item';

const KIND_ICONS: Record<ArchiveItemKind, ReactNode> = {
  file: <FileText size={14} />,
  library: <BookOpen size={14} />,
  'gallery-album': <ImageIcon size={14} />,
  'gallery-media': <ImageIcon size={14} />,
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

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

function ItemMedia({ item }: { item: ResolvedArchiveItem }) {
  if (item.kind === 'gallery-media' && item.tipoDetalhado === 'Foto') {
    return (
      <img
        src={item.viewHref}
        alt={item.titulo}
        className="border-border max-h-[70vh] w-full rounded-lg border object-contain"
      />
    );
  }

  if (item.kind === 'gallery-media' && item.tipoDetalhado === 'Vídeo') {
    return (
      <video
        src={item.viewHref}
        controls
        className="border-border w-full rounded-lg border bg-black"
      >
        Seu navegador não suporta reprodução de vídeo.
      </video>
    );
  }

  if (item.kind === 'file' || item.kind === 'library') {
    if (item.tipoDetalhado === 'Imagem' && item.thumbnailUrl) {
      return (
        <img
          src={item.thumbnailUrl}
          alt={item.titulo}
          className="border-border max-h-[70vh] w-full rounded-lg border object-contain"
        />
      );
    }
    return (
      <div className="border-border bg-background flex flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center">
        <FileText size={32} className="text-muted" strokeWidth={1.5} />
        <p className="text-muted text-sm">
          Prévia em tela não disponível para este tipo de arquivo. Use &quot;Visualizar&quot; para
          abrir o documento.
        </p>
      </div>
    );
  }

  if (item.kind === 'gallery-album' && item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt={item.titulo}
        className="border-border max-h-[70vh] w-full rounded-lg border object-contain"
      />
    );
  }

  return null;
}

/**
 * Corpo do "Item do Acervo" — cabeçalho, mídia e procedência. Compartilhado
 * entre a página cheia (`/acervo/item/[id]`) e a prévia interceptada
 * (`@preview/(.)item/[id]`) para não duplicar a composição visual.
 */
export function ArchiveItemContent({ item }: { item: ResolvedArchiveItem }) {
  return (
    <div className="flex flex-col gap-6">
      <ArchiveItemHeader
        kindLabel={item.kindLabel}
        icon={KIND_ICONS[item.kind]}
        titulo={item.titulo}
        descricao={item.descricao}
        actions={
          <>
            <a
              href={item.viewHref}
              target="_blank"
              rel="noreferrer"
              className="bg-primary hover:bg-primary-dark rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              Visualizar
            </a>
            {item.downloadHref && (
              <a
                href={item.downloadHref}
                className="border-border hover:border-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                <Download size={15} />
                Baixar
              </a>
            )}
          </>
        }
      />

      <ItemMedia item={item} />

      <ProvenancePanel
        fields={[
          { label: 'Categoria', value: item.categoriaNome },
          { label: 'Autor', value: item.autor },
          {
            label: 'Tipo',
            value: item.tipoDetalhado && <Badge variant="outline">{item.tipoDetalhado}</Badge>,
          },
          { label: 'Tamanho', value: item.tamanhoBytes ? formatBytes(item.tamanhoBytes) : null },
          {
            label: 'Data de referência',
            value: item.dataReferencia ? formatDate(item.dataReferencia) : null,
          },
          { label: 'Catalogado em', value: formatDate(item.catalogadoEm) },
        ]}
        footer={
          <Link href={item.legacyHref} className="text-accent hover:underline">
            {item.legacyLabel}
          </Link>
        }
      />
    </div>
  );
}
