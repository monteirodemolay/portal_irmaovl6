'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArchiveItemCard, MediaViewerModal, type MediaViewerItem } from '@vl6/ui';

export interface DocumentGridItem {
  id: string;
  /** Página cheia do item — sempre existe, mesmo quando `viewer` permite prévia em tela. */
  href: string;
  kindLabel: string;
  icon: ReactNode;
  titulo: string;
  descricao: string | null;
  thumbnailUrl: string | null;
  /** Presente quando o tipo de arquivo tem prévia em tela (imagem/PDF/vídeo) — clique abre o `MediaViewerModal` em vez de navegar. */
  viewer: MediaViewerItem | null;
}

/**
 * Grade compartilhada por Documentos e Biblioteca (Fase 0 — Visualizador
 * Unificado de Mídia): mesma composição visual dos dois, agora com
 * miniatura real e prévia em tela pra quem tem (`viewer` não-nulo) — clicar
 * abre o item ali mesmo, com anterior/próximo entre todos os itens
 * previsualizáveis da lista atual, sem sair da página. Itens sem prévia
 * (Word/Excel/PowerPoint) continuam navegando pra página cheia, como
 * sempre funcionou.
 */
export function DocumentGrid({ items }: { items: DocumentGridItem[] }) {
  const viewerItems = items
    .map((item) => item.viewer)
    .filter((viewer): viewer is MediaViewerItem => viewer !== null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          if (item.viewer) {
            const viewerIndex = viewerItems.indexOf(item.viewer);
            return (
              <ArchiveItemCard
                key={item.id}
                onClick={() => setOpenIndex(viewerIndex)}
                thumbnailUrl={item.thumbnailUrl}
                kindLabel={item.kindLabel}
                icon={item.icon}
                titulo={item.titulo}
                descricao={item.descricao}
              />
            );
          }
          return (
            <ArchiveItemCard
              key={item.id}
              href={item.href}
              thumbnailUrl={item.thumbnailUrl}
              kindLabel={item.kindLabel}
              icon={item.icon}
              titulo={item.titulo}
              descricao={item.descricao}
              linkComponent={Link}
            />
          );
        })}
      </div>

      {openIndex !== null && (
        <MediaViewerModal
          items={viewerItems}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
