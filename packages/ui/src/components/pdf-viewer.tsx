import * as React from 'react';
import { cn } from '../lib/cn';

export interface PdfViewerProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Prévia em tela de um PDF via `<iframe>` (renderização nativa do
 * navegador — sem `pdfjs-dist`/`DOMMatrix`, evitando o incidente já
 * conhecido desses pacotes em runtime serverless). Alguns navegadores
 * móveis não renderizam PDF embutido; por isso o "Visualizar" da página do
 * Item do Acervo (nova aba) continua sendo o caminho principal — este
 * componente é só a prévia opcional em tela.
 */
export function PdfViewer({ src, title, className }: PdfViewerProps) {
  return (
    <iframe
      src={src}
      title={title}
      className={cn('border-border h-[70vh] w-full rounded-lg border', className)}
    />
  );
}
