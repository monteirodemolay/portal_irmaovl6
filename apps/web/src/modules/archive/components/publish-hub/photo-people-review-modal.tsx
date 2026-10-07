'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@vl6/ui';
import type {
  ArchiveItemSummaryMedia,
  MemberPickerOption,
} from '../../actions/publish-hub-actions';
import { PeoplePicker } from './people-picker';

function mediaSrc(media: ArchiveItemSummaryMedia) {
  return `/api/archive-media/${media.id}`;
}

type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FaceDetectorInstance = {
  detect: (input: HTMLImageElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorInstance;

declare global {
  interface Window {
    FaceDetector?: FaceDetectorConstructor;
  }
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
 * A detecção de faces, quando suportada pelo navegador, acontece integralmente
 * no dispositivo do administrador através da Shape Detection API do próprio
 * browser. O Portal não envia a fotografia para serviço externo, não cria
 * template biométrico e não atribui identidade automaticamente. As sugestões
 * de nomes são apenas contextuais, derivadas de pessoas já confirmadas em
 * outras fotografias do mesmo conjunto. Só uma confirmação humana grava
 * `pessoasIdentificadas`.
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
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);
  const [faceState, setFaceState] = useState<'idle' | 'detecting' | 'done' | 'unsupported' | 'error'>(
    'idle',
  );

  const nameById = useMemo(
    () => new Map(memberOptions.map((option) => [option.id, option.nomeCompleto])),
    [memberOptions],
  );

  const selectedNames = useMemo(() => {
    if (!active) return [];
    return active.pessoasIdentificadas
      .map((id) => nameById.get(id))
      .filter((value): value is string => Boolean(value));
  }, [active, nameById]);

  const contextualSuggestions = useMemo(() => {
    if (!active) return [];
    const counts = new Map<string, number>();
    photos.forEach((photo, index) => {
      if (index === activeIndex) return;
      photo.pessoasIdentificadas.forEach((memberId) => {
        counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
      });
    });

    return [...counts.entries()]
      .filter(([memberId]) => !active.pessoasIdentificadas.includes(memberId) && nameById.has(memberId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([memberId, occurrences]) => ({
        memberId,
        nome: nameById.get(memberId) ?? 'Irmão',
        occurrences,
      }));
  }, [active, activeIndex, nameById, photos]);

  const unidentifiedCount = useMemo(
    () => photos.filter((photo) => photo.pessoasIdentificadas.length === 0).length,
    [photos],
  );

  const nextUnidentifiedIndex = useMemo(() => {
    if (photos.length === 0) return null;
    for (let offset = 1; offset <= photos.length; offset += 1) {
      const index = (activeIndex + offset) % photos.length;
      if (photos[index]?.pessoasIdentificadas.length === 0) return index;
    }
    return null;
  }, [activeIndex, photos]);

  const detectFaces = useCallback(async () => {
    const image = imageRef.current;
    if (!image || !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) return;

    if (typeof window === 'undefined' || !window.FaceDetector) {
      setFaceBoxes([]);
      setFaceState('unsupported');
      return;
    }

    setFaceState('detecting');
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 50 });
      const detections = await detector.detect(image);
      setFaceBoxes(
        detections.map(({ boundingBox }) => ({
          x: (boundingBox.x / image.naturalWidth) * 100,
          y: (boundingBox.y / image.naturalHeight) * 100,
          width: (boundingBox.width / image.naturalWidth) * 100,
          height: (boundingBox.height / image.naturalHeight) * 100,
        })),
      );
      setFaceState('done');
    } catch {
      setFaceBoxes([]);
      setFaceState('error');
    }
  }, []);

  useEffect(() => {
    setFaceBoxes([]);
    setFaceState('idle');
  }, [active?.id]);

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

  const confirmContextSuggestion = async (memberId: string) => {
    if (active.pessoasIdentificadas.includes(memberId)) return;
    await onPeopleChange(active, [...active.pessoasIdentificadas, memberId]);
  };

  const reviewPanel = (
    <>
      <div>
        <p className="text-accent text-xs font-semibold uppercase tracking-wider">
          Quem aparece nesta foto?
        </p>
        <h2 className="font-display mt-1 text-xl font-semibold">Revisão assistida</h2>
        <p className="text-muted mt-2 text-sm leading-6">
          O navegador pode localizar rostos, mas não decide quem são. Confirme manualmente cada
          pessoa antes de registrar a identificação no Acervo.
        </p>
      </div>

      <div className="border-border bg-background mt-4 rounded-xl border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Detecção local de rostos</p>
          <Button type="button" variant="outline" onClick={() => void detectFaces()}>
            {faceState === 'detecting' ? 'Detectando…' : 'Detectar'}
          </Button>
        </div>
        <p className="text-muted mt-2 text-xs leading-5">
          {faceState === 'done' && `${faceBoxes.length} rosto(s) localizado(s) nesta fotografia.`}
          {faceState === 'unsupported' &&
            'Este navegador não oferece a detecção facial local. A marcação manual continua disponível normalmente.'}
          {faceState === 'error' &&
            'Não foi possível detectar os rostos nesta foto. Isso não impede a identificação manual.'}
          {(faceState === 'idle' || faceState === 'detecting') &&
            'O processamento ocorre somente neste dispositivo e não envia a foto a um serviço de reconhecimento.'}
        </p>
      </div>

      {contextualSuggestions.length > 0 && (
        <div className="border-border mt-4 rounded-xl border p-3">
          <p className="text-sm font-semibold">Sugestões pelo contexto do Evento</p>
          <p className="text-muted mt-1 text-xs leading-5">
            Pessoas já confirmadas em outras fotos deste conjunto. Clique somente se você confirmar
            visualmente que ela aparece nesta imagem.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {contextualSuggestions.map((suggestion) => (
              <button
                key={suggestion.memberId}
                type="button"
                onClick={() => void confirmContextSuggestion(suggestion.memberId)}
                className="border-border hover:border-accent hover:bg-accent/10 rounded-full border px-3 py-1.5 text-left text-xs"
                title={`Confirmado em ${suggestion.occurrences} outra(s) foto(s) deste conjunto`}
              >
                + {suggestion.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <PeoplePicker
          selectedIds={active.pessoasIdentificadas}
          options={memberOptions}
          onChange={(ids) => void onPeopleChange(active, ids)}
        />
      </div>

      {selectedNames.length > 0 && (
        <div className="border-border mt-4 rounded-xl border p-3">
          <p className="text-xs font-semibold">Confirmados nesta foto</p>
          <ul className="text-muted mt-2 space-y-1 text-sm">
            {selectedNames.map((name) => (
              <li key={name}>• {name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-border bg-background mt-4 rounded-xl border p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold">Fila de revisão</p>
            <p className="text-muted mt-1 text-xs">
              {unidentifiedCount} foto(s) ainda sem pessoa identificada.
            </p>
          </div>
          {nextUnidentifiedIndex !== null && nextUnidentifiedIndex !== activeIndex && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onIndexChange(nextUnidentifiedIndex)}
            >
              Próxima sem identificação
            </Button>
          )}
        </div>
      </div>
    </>
  );

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
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-white/60 sm:inline">
              {unidentifiedCount} sem identificação
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/30 text-white"
            >
              Fechar
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
          <div className="relative flex max-h-full max-w-full items-center justify-center">
            <img
              ref={imageRef}
              src={mediaSrc(active)}
              alt={active.altText ?? active.caption ?? active.originalName}
              className="max-h-[calc(100vh-11rem)] max-w-full select-none object-contain lg:max-h-[calc(100vh-8rem)]"
              onLoad={() => void detectFaces()}
            />
            {faceBoxes.map((box, index) => (
              <div
                key={`${active.id}-face-${index}`}
                className="pointer-events-none absolute rounded-md border-2 border-amber-300 shadow-[0_0_0_1px_rgba(0,0,0,.45)]"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
                aria-hidden="true"
              >
                <span className="absolute -top-6 left-0 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Rosto {index + 1}
                </span>
              </div>
            ))}
          </div>

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
                'relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ' +
                (index === activeIndex
                  ? 'border-white'
                  : 'border-transparent opacity-60 hover:opacity-100')
              }
              aria-label={`Abrir foto ${index + 1}`}
            >
              <img src={mediaSrc(photo)} alt="" className="h-full w-full object-cover" />
              {photo.pessoasIdentificadas.length > 0 && (
                <span
                  className="absolute bottom-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white"
                  title="Pessoas confirmadas nesta fotografia"
                >
                  {photo.pessoasIdentificadas.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <aside className="bg-surface hidden w-[390px] shrink-0 flex-col overflow-y-auto border-l border-white/10 p-5 lg:flex">
        {reviewPanel}
      </aside>

      <div className="bg-surface fixed inset-x-0 bottom-0 z-[121] max-h-[48vh] overflow-y-auto border-t p-4 lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Quem aparece nesta foto?</p>
          <span className="text-muted text-xs">
            {activeIndex + 1}/{photos.length}
          </span>
        </div>
        {reviewPanel}
      </div>
    </div>
  );
}
