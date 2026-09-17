'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Camera, X } from '@vl6/ui';
import {
  removeCommunityHeroPhotoAction,
  updateCommunityHeroPhotoAction,
  type CommunityHeroPhotoActionState,
} from '@/modules/tenancy/actions/community-hero-photo-actions';

/**
 * Controles de foto do Templo na hero da Comunidade VL6 — só renderizado
 * pra quem tem `tenant:manage` (`CommunityHero` decide isso, nunca este
 * componente sozinho). Equivalente funcional dos controles do mock-up
 * ("Selecionar foto do Templo" / enquadramento / "Retirar foto"), adaptado
 * pra persistir de verdade: aqui a foto é enviada ao Blob storage e fica
 * visível pra toda a Loja, não só neste navegador.
 */
export function CommunityHeroPhotoUpload({
  hasPhoto,
  initialPosicao,
}: {
  hasPhoto: boolean;
  initialPosicao: number;
}) {
  const [updateState, updateAction] = useActionState<CommunityHeroPhotoActionState, FormData>(
    updateCommunityHeroPhotoAction,
    { error: null },
  );
  const [removeState, removeAction] = useActionState<CommunityHeroPhotoActionState, FormData>(
    removeCommunityHeroPhotoAction,
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
          Selecionar foto do Templo
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
