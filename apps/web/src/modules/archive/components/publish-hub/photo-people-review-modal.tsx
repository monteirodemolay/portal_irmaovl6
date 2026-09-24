'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@vl6/ui';
import type {
  ArchiveItemSummaryMedia,
  MemberPickerOption,
} from '../../actions/publish-hub-actions';
import { PeoplePicker } from './people-picker';

function mediaSrc(media: ArchiveItemSummaryMedia) {
  return `/api/archive-media/${media.id}`;
}

export interface PhotoPeopleReviewModalProps {
  photos: ArchiveItemSummaryMedia[];
  activeIndex: number;
  memberOptions: MemberPickerOption[];
  onIndexChange: (index: number) => void;
  onPeopleChange: (media: ArchiveItemSummaryMedia, ids: string[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Revisão ampliada de pessoas nas fotografias.
 *
 * A grade pequena do passo "Organizar" continua útil para capa/ordem, mas
 * não é adequada para identificação humana. Este modal abre o arquivo em
 * escala grande, mantém navegação por teclado e permite marcar pessoas sem
 * sair da fotografia. É deliberadamente manual: a futura sugestão facial
 * local deverá alimentar o mesmo PeoplePicker, nunca gravar identidades sem
 * confirmação do administrador.
 */
export function PhotoPeopleReviewModal({
  photos,
  activeIndex,
  memberOptions,
  onIndexChange,
  onPeopleChange,
  onClose,
}: PhotoPeopleReviewModalProps) {
  const active = photos[activeIndex] ?? null;

  const selectedNames = useMemo(() => {
    if (!active) return [];
    const nameById = new Map(memberOptions.map((option) => [option.id, option.nomeCompleto]));
    return active.pessoasIdentificadas
      .map((id) => nameById.get(id))
      .filter((value): value is string => Boolean(value));
  }, [active, memberOptions]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && activeIndex > 0) onIndexChange(activeIndex - 1);
      if (event.key === 'ArrowRight' && activeIndex < photos.length - 1) {
        onIndexChange(activeIndex + 1);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, photos.length, onClose, onIndexChange]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Revisão ampliada de pessoas"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-xs text-white/60">Revisão de pessoas</p>
            <p className="truncate text-sm font-semibold">
              Foto {activeIndex + 1} de {photos.length}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onClose} className="border-white/30 text-white">
            Fechar
          </Button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
          <img
            src={mediaSrc(active)}
            alt={active.altText ?? active.caption ?? active.originalName}
            className="max-h-full max-w-full select-none object-contain"
          />

          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => onIndexChange(activeIndex - 1)}
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-2xl text-white backdrop-blur hover:bg-black/75"
              aria-label="Foto anterior"
            >
              ‹
            </button>
          )}
          {activeIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={() => onIndexChange(activeIndex + 1)}
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-2xl text-white backdrop-blur hover:bg-black/75"
              aria-label="Próxima foto"
            >
              ›
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-3">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onIndexChange(index)}
              className={
                'h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ' +
                (index === activeIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100')
              }
              aria-label={`Abrir foto ${index + 1}`}
            >
              <img src={mediaSrc(photo)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <aside className="bg-surface hidden w-[360px] shrink-0 flex-col border-l border-white/10 p-5 lg:flex">
        <p className="text-accent text-xs font-semibold uppercase tracking-wider">
          Quem aparece nesta foto?
        </p>
        <h2 className="font-display mt-1 text-xl font-semibold">Identificação manual</h2>
        <p className="text-muted mt-2 text-sm leading-6">
          Marque somente pessoas que você consegue confirmar visualmente. A identificação fica
          vinculada a esta fotografia no Acervo.
        </p>

        <div className="mt-5">
          <PeoplePicker
            selectedIds={active.pessoasIdentificadas}
            options={memberOptions}
            onChange={(ids) => void onPeopleChange(active, ids)}
          />
        </div>

        {selectedNames.length > 0 && (
          <div className="border-border mt-5 rounded-xl border p-3">
            <p className="text-xs font-semibold">Confirmados nesta foto</p>
            <ul className="text-muted mt-2 space-y-1 text-sm">
              {selectedNames.map((name) => (
                <li key={name}>• {name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-border bg-background mt-auto rounded-xl border p-3">
          <p className="text-xs font-semibold">Próxima etapa: sugestão facial local</p>
          <p className="text-muted mt-1 text-xs leading-5">
            O reconhecimento será executado no navegador e servirá apenas para sugerir candidatos.
            Nenhuma identidade será confirmada automaticamente.
          </p>
        </div>
      </aside>

      <div className="bg-surface fixed inset-x-0 bottom-0 z-[121] max-h-[42vh] overflow-y-auto border-t p-4 lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Quem aparece nesta foto?</p>
          <span className="text-muted text-xs">{activeIndex + 1}/{photos.length}</span>
        </div>
        <PeoplePicker
          selectedIds={active.pessoasIdentificadas}
          options={memberOptions}
          onChange={(ids) => void onPeopleChange(active, ids)}
        />
      </div>
    </div>
  );
}
