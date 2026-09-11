'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '../icons';

export interface PhotoPreviewModalProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Prévia ampliada de uma única foto (Irmãos reconhecem rosto antes de nome
 * — pedido explícito: tornar toda foto de perfil clicável, "igual de
 * outras redes sociais"). Radix Dialog cuida do essencial de acessibilidade
 * de graça: Portal (escapa de qualquer ancestral com `transform`/
 * `overflow`), ESC pra fechar, foco preso dentro do diálogo, clique fora
 * fecha. Diferente do `MediaViewerModal` (galeria com navegação entre
 * itens) — aqui é sempre uma foto só, sem paginação.
 */
export function PhotoPreviewModal({ src, alt, open, onOpenChange }: PhotoPreviewModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in fixed inset-0 z-[70] bg-black/90" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 outline-none sm:p-10"
          onClick={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Foto de {alt} ampliada. Pressione ESC ou clique fora para fechar.
          </DialogPrimitive.Description>
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
            draggable={false}
          />
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="fixed right-3 top-3 z-[71] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <X size={20} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
