'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Camera, X } from '@vl6/ui';
import {
  removeHeroPhotoAction,
  updateHeroPhotoAction,
  type HeroPhotoActionState,
} from '@/modules/tenancy/actions/hero-photo-actions';

/**
 * Controles de foto do `PageHero` — só renderizado pra quem tem
 * `tenant:manage` (cada página decide isso, nunca este componente sozinho).
 * `pageKey` identifica qual entrada de `Tenant.heroPhotos` é editada;
 * `path` é a rota revalidada depois de salvar/remover.
 */
export function PageHeroPhotoUpload({
  pageKey,
  path,
  hasPhoto,
  initialPosicao,
  photoLabel = 'Selecionar foto',
}: {
  pageKey: string;
  path: string;
  hasPhoto: boolean;
  initialPosicao: number;
  photoLabel?: string;
}) {
  const updateActionWithKey = updateHeroPhotoAction.bind(null, pageKey, path);
  const removeActionWithKey = removeHeroPhotoAction.bind(null, pageKey, path);
  const [updateState, updateAction] = useActionState<HeroPhotoActionState, FormData>(
    updateActionWithKey,
    { error: null },
  );
  const [removeState, removeAction] = useActionState<HeroPhotoActionState, FormData>(
    removeActionWithKey,
    { error: null },
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [posicao, setPosicao] = useState(initialPosicao);

  // Depois de um envio bem-sucedido, a página é revalidada (nova foto já
  // veio do servidor) — limpa a seleção local pra "Retirar foto" voltar a
  // aparecer no lugar do formulário de envio. Em caso de erro, mantém a
  // seleção pra o Administrador poder tentar de novo sem escolher o
  // arquivo outra vez.
  useEffect(() => {
    if (!updateState.error) {
      setSelectedFile(null);
    }
  }, [updateState]);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/85">
      <form action={updateAction} className="flex flex-wrap items-center gap-3">
        <label className="hover:border-accent inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/35 bg-white/10 px-3 py-1.5 font-medium transition-colors">
          <Camera size={13} strokeWidth={1.75} />
          {photoLabel}
          <input
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {selectedFile && (
          <>
            <label className="flex items-center gap-2">
              Enquadramento
              <input
                type="range"
                name="posicao"
                min={0}
                max={100}
                value={posicao}
                onChange={(event) => setPosicao(Number(event.target.value))}
                aria-label="Posição vertical da fotografia"
                className="accent-accent w-20"
              />
            </label>
            <SaveButton />
          </>
        )}
      </form>

      {hasPhoto && !selectedFile && (
        <form action={removeAction}>
          <button
            type="submit"
            className="hover:border-accent inline-flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/10 px-3 py-1.5 font-medium transition-colors"
          >
            <X size={13} strokeWidth={1.75} />
            Retirar foto
          </button>
        </form>
      )}

      {(updateState.error || removeState.error) && (
        <p className="w-full text-[11px] text-red-200">{updateState.error ?? removeState.error}</p>
      )}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent text-primary-dark rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
    >
      {pending ? 'Enviando…' : 'Salvar foto'}
    </button>
  );
}
