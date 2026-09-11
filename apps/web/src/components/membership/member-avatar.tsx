'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage, cn, Compass, PhotoPreviewModal } from '@vl6/ui';

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Avatar do Irmão com fallback em cascata (docs/architecture/06 — Foto do
 * Irmão): foto cadastrada → iniciais do nome → ícone institucional. Nunca
 * uma imagem aleatória.
 *
 * Clicável por padrão sempre que há foto — abre uma prévia ampliada
 * (`PhotoPreviewModal`), padrão pedido explicitamente porque os Irmãos
 * reconhecem uns aos outros pelo rosto, não pelo nome, e os avatares
 * pequenos nas listas/cards não deixam ver o rosto direito. `disablePreview`
 * só existe pros poucos lugares em que o próprio avatar já é o gatilho de
 * TROCAR a foto (ex.: `SelfPhotoUpload`, dentro de um `<label>`) — clicar
 * ali precisa abrir o seletor de arquivo, não a prévia.
 */
export function MemberAvatar({
  fotoUrl,
  nome,
  className,
  imgClassName,
  disablePreview = false,
}: {
  fotoUrl: string | null;
  nome: string;
  className?: string;
  /** Ex.: `object-top` — avatares grandes e não-circulares (retrato em vez de rosto já enquadrado) cortam a testa quando o recorte fica centralizado. */
  imgClassName?: string;
  /** `true` quando o clique no avatar já dispara outra coisa (trocar a foto) — evita competir com a prévia. */
  disablePreview?: boolean;
}) {
  const initials = getInitials(nome);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canPreview = Boolean(fotoUrl) && !disablePreview;

  const avatar = (
    <Avatar className={cn('h-10 w-10', className)}>
      {fotoUrl && (
        <AvatarImage
          src={fotoUrl}
          alt={nome}
          className={cn(canPreview && 'transition-opacity group-hover:opacity-80', imgClassName)}
        />
      )}
      <AvatarFallback>{initials || <Compass size={16} strokeWidth={1.75} />}</AvatarFallback>
    </Avatar>
  );

  if (!canPreview) return avatar;

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Ver foto de ${nome} ampliada`}
        className="group inline-flex cursor-zoom-in"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPreviewOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setPreviewOpen(true);
          }
        }}
      >
        {avatar}
      </span>
      <PhotoPreviewModal
        src={fotoUrl!}
        alt={nome}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
