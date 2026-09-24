'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from '@vl6/ui';

export interface NewsImageGalleryProps {
  images: string[];
  title: string;
}

export function NewsImageGallery({ images, title }: NewsImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  function previous() {
    setActiveIndex((current) => {
      if (current === null) return 0;
      return (current - 1 + images.length) % images.length;
    });
  }

  function next() {
    setActiveIndex((current) => {
      if (current === null) return 0;
      return (current + 1) % images.length;
    });
  }

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <section className="mx-auto mt-10 max-w-5xl">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
              Galeria
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold">Fotos da notícia</h2>
          </div>
          <span className="text-muted text-xs">
            {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={
                'group relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                (index === 0 && images.length > 2 ? 'col-span-2 row-span-2' : '')
              }
              aria-label={'Abrir foto ' + (index + 1) + ' de ' + images.length}
            >
              <img
                src={url}
                alt={'Foto ' + (index + 1) + ' de ' + title}
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-8 text-right text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {index + 1}/{images.length}
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeImage && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da galeria"
          onClick={() => setActiveIndex(null)}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Fechar galeria"
          >
            <X size={22} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                previous();
              }}
              className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div
            className="flex max-h-full max-w-6xl flex-col items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={activeImage}
              alt={'Foto ' + (activeIndex + 1) + ' de ' + title}
              className="max-h-[82vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-3 flex items-center gap-3 text-sm text-white/80">
              <span>{activeIndex + 1} de {images.length}</span>
              <span className="hidden sm:inline">Use ← → para navegar e Esc para fechar</span>
            </div>
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5"
              aria-label="Próxima foto"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex max-w-[88vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-xl bg-black/35 p-2 backdrop-blur">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={
                    'h-14 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-opacity ' +
                    (index === activeIndex ? 'border-white opacity-100' : 'border-transparent opacity-55 hover:opacity-90')
                  }
                  aria-label={'Ir para foto ' + (index + 1)}
                  aria-current={index === activeIndex ? 'true' : undefined}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
