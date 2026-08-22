'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@vl6/ui';

export interface UnifiedDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

/**
 * Dropzone unificada do passo "Enviar" — arrastar-e-soltar + seleção de
 * arquivos, aceitando lote misto (foto/vídeo/áudio/documento na mesma
 * seleção). A classificação por tipo aqui é só feedback visual imediato;
 * a que importa (persistida em `ArchiveMedia.mediaType`) é decidida no
 * servidor a partir do MIME real detectado (`uploadArchiveMediaAction`).
 */
export function UnifiedDropzone({ onFilesSelected, disabled }: UnifiedDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        'border-border flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
        isDragOver && 'border-accent bg-accent/10',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'cursor-pointer',
      )}
    >
      <p className="font-medium">Arraste fotos, vídeos, áudios ou documentos aqui</p>
      <p className="text-muted text-sm">
        ou clique para selecionar arquivos — envie quantos quiser
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
