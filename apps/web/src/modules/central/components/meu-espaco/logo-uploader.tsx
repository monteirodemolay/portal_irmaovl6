'use client';

import { useState } from 'react';
import { Image as ImageIcon } from '@vl6/ui';

/**
 * Upload de logo/imagem compartilhado entre `EmpresaTab` (obrigatório no
 * espírito, "cartão de divulgação") e `AfiliacoesTab` (sempre opcional) —
 * mesmo comportamento (preview local via `URL.createObjectURL`, upload real
 * só acontece na Server Action), o `inputName` é quem decide em qual campo
 * de `FormData` o arquivo chega (`logo-<id>` vs `logo-afiliacao-<id>`, pra
 * nunca colidir quando os dois arrays viajam juntos).
 */
export function LogoUploader({
  inputName,
  imageUrl,
  entityLabel,
}: {
  inputName: string;
  imageUrl: string | null;
  entityLabel: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? imageUrl;

  return (
    <label
      htmlFor={inputName}
      className="border-border bg-surface hover:border-primary group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
      title="Enviar logo"
    >
      {shown ? (
        <img
          src={shown}
          alt={`Logo de ${entityLabel || 'instituição'}`}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <ImageIcon size={22} className="text-muted" strokeWidth={1.5} />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:bg-black/50 group-hover:opacity-100">
        Trocar
      </span>
      <input
        id={inputName}
        name={inputName}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </label>
  );
}
