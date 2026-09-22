import * as React from 'react';
import { cn } from '../lib/cn';

export interface PageHeroProps {
  /** Selo curto em maiúsculas acima do título (ex. nome da Loja, saudação). */
  kicker: string;
  kickerIcon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Legenda pequena e discreta abaixo da descrição (ex. nome do Templo). */
  meta?: React.ReactNode;
  /** Foto de fundo (`Tenant.heroPhotos[pageKey]`, via `resolveHeroPhoto`). Sem foto, cai no gradiente institucional. */
  photoUrl?: string | null;
  /** Enquadramento vertical da foto, 0–100. */
  photoPosicao?: number;
  /** Conteúdo abaixo da descrição — busca, filtros, controles de foto (admin). */
  actions?: React.ReactNode;
  /** Conteúdo à direita em telas largas (ex. card de destaque). */
  side?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho institucional padrão de toda página de topo do Portal — mesmo
 * visual em `/irmaos`, `/dashboard`, `/acervo`, `/paramaconicas` etc., com
 * ou sem foto de fundo. Substitui os cabeçalhos que cada página inventava
 * por conta própria (gradientes e paddings levemente diferentes entre si).
 * Páginas de detalhe/listagem interna (ex. `/acervo/gestoes/[id]`) usam o
 * `AcervoPageHeader`, mais leve — colocar este hero cheio em toda subpágina
 * pesaria a navegação sem ganho visual.
 */
export function PageHero({
  kicker,
  kickerIcon,
  title,
  description,
  meta,
  photoUrl,
  photoPosicao,
  actions,
  side,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'from-primary to-primary-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-md',
        className,
      )}
    >
      <div className="bg-accent/10 pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl" />
      {photoUrl && (
        <>
          <img
            src={photoUrl}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            style={{ objectPosition: `center ${photoPosicao ?? 50}%` }}
          />
          <div className="from-primary-dark/95 via-primary-dark/80 to-primary-dark/40 absolute inset-0 -z-10 bg-gradient-to-r" />
        </>
      )}

      <div className="relative flex flex-col gap-6 p-7 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="text-accent flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.19em]">
            {kickerIcon}
            {kicker}
          </span>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
          {description && <p className="max-w-xl text-sm leading-6 text-white/85">{description}</p>}
          {meta && <p className="text-accent/90 text-xs">{meta}</p>}
          {actions && <div className="mt-1 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {side && <div className="shrink-0">{side}</div>}
      </div>
    </section>
  );
}
