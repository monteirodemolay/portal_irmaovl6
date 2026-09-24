'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Button,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  History,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Users,
  cn,
} from '@vl6/ui';
import type {
  ConstellationMemory,
  MemoryConstellationBundle,
} from '../lib/constellation-memory.types';

export interface MemoryConstellationProps {
  initial: MemoryConstellationBundle;
}

const MEMORY_INTERVAL_MS = 9000;
const PHOTO_INTERVAL_MS = 3500;

function pickDifferentIndex(length: number, current: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

function memoryImage(memory: ConstellationMemory | undefined): string | null {
  if (!memory) return null;
  return memory.media[0]?.url ?? memory.fallbackImageUrl;
}

export function MemoryConstellation({ initial }: MemoryConstellationProps) {
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null);
  const [memories, setMemories] = React.useState(initial.memories);
  const [stats, setStats] = React.useState(initial.stats);
  const [index, setIndex] = React.useState(0);
  const [photoIndex, setPhotoIndex] = React.useState(0);
  const [automatic, setAutomatic] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const current = memories[index];
  const currentPhoto = current?.media[photoIndex];
  const currentImage = currentPhoto?.url ?? current?.fallbackImageUrl ?? null;

  React.useEffect(() => {
    setPhotoIndex(0);
  }, [current?.id]);

  React.useEffect(() => {
    if (!automatic || memories.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % memories.length);
    }, MEMORY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [automatic, memories.length]);

  React.useEffect(() => {
    if (!automatic || !current || current.media.length <= 1) return;
    const timer = window.setInterval(() => {
      setPhotoIndex((value) => (value + 1) % current.media.length);
    }, PHOTO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [automatic, current]);

  const upcoming = React.useMemo(() => {
    if (memories.length <= 1) return [];
    const count = Math.min(3, memories.length - 1);
    return Array.from({ length: count }, (_, offset) => memories[(index + offset + 1) % memories.length])
      .filter((memory): memory is ConstellationMemory => Boolean(memory));
  }, [index, memories]);

  async function changeYear(value: string) {
    if (value === 'all') {
      setSelectedYear(null);
      setMemories(initial.memories);
      setStats(initial.stats);
      setIndex(0);
      setPhotoIndex(0);
      return;
    }

    const year = Number(value);
    if (!Number.isInteger(year)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/acervo/constelacao/memorias?year=${year}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('memory_load_failed');
      const bundle = (await response.json()) as MemoryConstellationBundle;
      setSelectedYear(year);
      setMemories(bundle.memories);
      setStats(bundle.stats);
      setIndex(0);
      setPhotoIndex(0);
    } finally {
      setLoading(false);
    }
  }

  function surpriseMe() {
    if (memories.length === 0) return;

    if (selectedYear !== null) {
      setIndex((value) => pickDifferentIndex(memories.length, value));
      setPhotoIndex(0);
      return;
    }

    const byYear = new Map<number, number[]>();
    memories.forEach((memory, memoryIndex) => {
      const indexes = byYear.get(memory.year) ?? [];
      indexes.push(memoryIndex);
      byYear.set(memory.year, indexes);
    });
    const years = [...byYear.keys()];
    const year = years[Math.floor(Math.random() * years.length)];
    const candidates = year ? byYear.get(year) ?? [] : [];
    if (candidates.length === 0) return;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (chosen !== undefined) {
      setIndex(chosen);
      setPhotoIndex(0);
    }
  }

  function previousMemory() {
    if (memories.length === 0) return;
    setIndex((value) => (value - 1 + memories.length) % memories.length);
  }

  function nextMemory() {
    if (memories.length === 0) return;
    setIndex((value) => (value + 1) % memories.length);
  }

  if (!current) {
    return (
      <section className="border-border bg-surface rounded-[22px] border p-8 text-center shadow-sm">
        <Compass className="text-accent mx-auto" size={28} />
        <h2 className="font-display mt-4 text-2xl font-semibold">A Constelação está pronta para receber memórias</h2>
        <p className="text-muted mx-auto mt-2 max-w-xl text-sm leading-6">
          Assim que Eventos tiverem itens publicados no Acervo VL6, as lembranças serão
          conectadas e exibidas aqui automaticamente.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Central de Memória da Constelação VL6" className="flex flex-col gap-4">
      <div className="border-border bg-surface flex flex-col gap-3 rounded-[18px] border p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
            Escolha apenas o período. A Constelação faz o restante.
          </p>
          <p className="text-muted mt-1 text-xs">
            {stats.totalMemories} lembranças · {stats.totalPhotos} fotografias · {stats.totalYears} anos com registros
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-muted text-xs font-medium" htmlFor="constellation-year">
            Período
          </label>
          <select
            id="constellation-year"
            value={selectedYear ?? 'all'}
            disabled={loading}
            onChange={(event) => void changeYear(event.target.value)}
            className="border-border bg-background h-9 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">Toda a história</option>
            {initial.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <Button type="button" variant="outline" size="sm" onClick={surpriseMe} disabled={loading}>
            <Star size={14} className="text-accent" />
            Surpreenda-me
          </Button>
          <Button
            type="button"
            variant={automatic ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setAutomatic((value) => !value)}
          >
            {automatic ? <Sparkles size={14} /> : <Play size={14} />}
            {automatic ? 'Memória automática' : 'Iniciar memória'}
          </Button>
        </div>
      </div>

      <div className="bg-primary relative overflow-hidden rounded-[24px] shadow-lg">
        <div className="border-accent/15 pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border" />
        <div className="border-accent/10 pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full border" />

        <div className="relative grid min-h-[34rem] lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
          <div className="relative min-h-[28rem] overflow-hidden bg-black/25 lg:min-h-[34rem]">
            {currentImage ? (
              <div
                role="img"
                aria-label={currentPhoto?.altText || currentPhoto?.caption || current.title}
                className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-700"
                style={{ backgroundImage: `url(${JSON.stringify(currentImage)})` }}
              />
            ) : (
              <div className="from-primary-dark via-primary to-primary absolute inset-0 bg-gradient-to-br" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/15" />

            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="bg-accent text-primary-dark rounded-full px-3 py-1 text-[11px] font-bold tracking-wide">
                  {current.year}
                </span>
                {current.boardTermName && (
                  <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
                    {current.boardTermName}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-white/75">{current.dateLabel}</p>
              <h2 aria-live="polite" className="font-display mt-1 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                {current.title}
              </h2>
              {current.archiveTitle && (
                <p className="mt-2 max-w-2xl text-sm text-white/70">{current.archiveTitle}</p>
              )}
            </div>

            <div className="absolute left-4 top-4 flex items-center gap-2">
              <button
                type="button"
                aria-label="Lembrança anterior"
                onClick={previousMemory}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Próxima lembrança"
                onClick={nextMemory}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {current.media.length > 1 && (
              <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                {photoIndex + 1} / {current.media.length} fotos
              </div>
            )}
          </div>

          <aside className="relative flex flex-col justify-between p-6 text-white sm:p-7">
            <div>
              <p className="text-accent flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                <Sparkles size={14} />
                Esta memória se conecta a
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {current.boardTermName && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs">
                    Gestão · {current.boardTermName}
                  </span>
                )}
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs">
                  Evento · {current.year}
                </span>
                {current.kindLabels.slice(0, 3).map((label) => (
                  <span key={label} className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs">
                    {label}
                  </span>
                ))}
                {current.peopleCount > 0 && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs">
                    {current.peopleCount} pessoas identificadas
                  </span>
                )}
              </div>

              {current.description && (
                <p className="mt-6 line-clamp-5 text-sm leading-6 text-white/72">
                  {current.description}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <ImageIcon className="text-accent" size={16} />
                  <strong className="mt-2 block text-lg">{current.photoCount}</strong>
                  <span className="text-[10px] uppercase tracking-wider text-white/50">fotografias</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Users className="text-accent" size={16} />
                  <strong className="mt-2 block text-lg">{current.peopleCount}</strong>
                  <span className="text-[10px] uppercase tracking-wider text-white/50">identificados</span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <div className="text-xs text-white/55">
                {current.location && (
                  <p className="flex items-center gap-2">
                    <Compass size={13} /> {current.location}
                  </p>
                )}
                <p className={cn('flex items-center gap-2', current.location && 'mt-2')}>
                  <CalendarDays size={13} /> {current.dateLabel}
                </p>
              </div>
              <Button asChild variant="accent" className="mt-5 w-full">
                <Link href={current.href}>Ver este momento</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="border-border bg-surface rounded-[18px] border p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-accent text-[10px] font-semibold uppercase tracking-[0.18em]">
                Próximas lembranças
              </p>
              <p className="text-muted mt-1 text-xs">A sequência muda conforme você explora a história.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setPhotoIndex(0);
              }}
              className="text-muted hover:text-primary flex items-center gap-1.5 text-xs font-medium"
            >
              <RotateCcw size={13} />
              Recomeçar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {upcoming.map((memory) => {
              const preview = memoryImage(memory);
              const memoryIndex = memories.findIndex((candidate) => candidate.id === memory.id);
              return (
                <button
                  key={memory.id}
                  type="button"
                  onClick={() => {
                    if (memoryIndex >= 0) setIndex(memoryIndex);
                    setPhotoIndex(0);
                  }}
                  className="border-border group relative min-h-28 overflow-hidden rounded-xl border text-left"
                >
                  {preview ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url(${JSON.stringify(preview)})` }}
                    />
                  ) : (
                    <div className="from-primary to-primary-dark absolute inset-0 bg-gradient-to-br" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="relative flex min-h-28 flex-col justify-end p-4 text-white">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                      {memory.year}
                    </span>
                    <span className="font-display mt-1 line-clamp-2 text-base font-semibold leading-5">
                      {memory.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-muted flex items-center justify-center gap-2 text-center text-xs">
        <History size={13} />
        A Constelação usa somente registros reais e publicados do Acervo VL6.
      </div>
    </section>
  );
}
