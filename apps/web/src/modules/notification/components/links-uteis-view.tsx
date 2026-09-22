'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  LINK_ACCESS_TYPE_LABELS,
  LINK_CATEGORY_KEYS,
  LINK_CATEGORY_LABELS,
  type LinkAccessTypeKey,
  type LinkCategoryKey,
} from '@vl6/shared';
import {
  ArrowUpRight,
  Building2,
  Compass,
  EmptyState,
  GraduationCap,
  Heart,
  Landmark,
  Link2,
  PageHero,
  Search,
  Star,
  cn,
} from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { toggleLinkFavoriteAction } from '../actions/link-actions';
import { SuggestLinkCard } from './suggest-link-card';

export interface LinksUteisItem {
  id: string;
  titulo: string;
  url: string;
  descricao: string | null;
  categoria: LinkCategoryKey;
  tipoAcesso: LinkAccessTypeKey;
  destaque: boolean;
  favorito: boolean;
}

const CATEGORY_ICON: Record<LinkCategoryKey, typeof Building2> = {
  loja: Building2,
  institucional: Landmark,
  estudos: GraduationCap,
  familia: Heart,
  outro: Link2,
};

type FilterKey = 'todos' | 'favoritos' | LinkCategoryKey;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Faixa Unicode "Combining Diacritical Marks" (U+0300-U+036F) construída via
// code points, mesmo padrão de `sanitizeFileName` (archive-actions.ts) —
// evita caracteres de combinação literais no código-fonte.
const COMBINING_MARKS_PATTERN = new RegExp(
  `[${String.fromCodePoint(0x0300)}-${String.fromCodePoint(0x036f)}]`,
  'g',
);

function normalize(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS_PATTERN, '').toLocaleLowerCase('pt-BR');
}

/**
 * Central de Links Úteis — busca, filtro por categoria, favoritos pessoais
 * e sugestão de novos acessos, seguindo o mock-up visual/funcional
 * aprovado pelo Administrador, adaptado ao design system existente (mesmos
 * tokens de cor/tipografia/componentes do resto do Portal VL6 — nenhum CSS
 * novo, nenhuma dependência nova). Estado de favorito é otimista: o clique
 * atualiza a tela na hora, a Server Action confirma em segundo plano.
 */
export function LinksUteisView({
  links,
  heroPhotoUrl,
  heroPhotoPosicao,
  canManageHeroPhoto = false,
}: {
  links: LinksUteisItem[];
  heroPhotoUrl?: string | null;
  heroPhotoPosicao?: number;
  canManageHeroPhoto?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(links.filter((link) => link.favorito).map((link) => link.id)),
  );
  const [, startTransition] = useTransition();

  const featured = useMemo(() => links.filter((link) => link.destaque), [links]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return links.filter((link) => {
      if (filter === 'favoritos' && !favoriteIds.has(link.id)) return false;
      if (filter !== 'todos' && filter !== 'favoritos' && link.categoria !== filter) return false;
      if (!term) return true;
      const haystack = normalize(
        `${link.titulo} ${link.descricao ?? ''} ${LINK_CATEGORY_LABELS[link.categoria]}`,
      );
      return haystack.includes(term);
    });
  }, [links, filter, favoriteIds, query]);

  function toggleFavorite(linkId: string) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(linkId)) next.delete(linkId);
      else next.add(linkId);
      return next;
    });
    startTransition(() => {
      void toggleLinkFavoriteAction(linkId);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHero
        kicker="Central de referências"
        kickerIcon={<Compass size={16} strokeWidth={1.6} />}
        title="Links Úteis"
        description="Encontre, em um só lugar, os acessos da Loja, instituições maçônicas, materiais de estudo e serviços usados no dia a dia."
        photoUrl={heroPhotoUrl}
        photoPosicao={heroPhotoPosicao}
        actions={
          canManageHeroPhoto && (
            <PageHeroPhotoUpload
              pageKey="links-uteis"
              path="/links-uteis"
              hasPhoto={Boolean(heroPhotoUrl)}
              initialPosicao={heroPhotoPosicao ?? 50}
            />
          )
        }
        side={
          <div className="w-full lg:max-w-sm">
            <label className="sr-only" htmlFor="links-search">
              Pesquisar
            </label>
            <div className="relative">
              <Search size={18} className="text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="links-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por nome, assunto ou instituição"
                className="text-ink focus:border-accent focus-visible:ring-accent w-full min-w-0 rounded-xl border border-white/15 bg-white py-3.5 pl-11 pr-4 text-sm shadow-md outline-none focus-visible:ring-2"
              />
            </div>
          </div>
        }
      />

      {featured.length > 0 && (
        <section>
          <h2 className="font-display mb-3 text-xl font-semibold">Acessos em destaque</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((link) => {
              const Icon = CATEGORY_ICON[link.categoria];
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target={link.tipoAcesso === 'externo' ? '_blank' : undefined}
                  rel={link.tipoAcesso === 'externo' ? 'noreferrer' : undefined}
                  className="border-border bg-surface hover:border-accent group flex flex-col rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="bg-accent/10 text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                      <Icon size={20} strokeWidth={1.7} />
                    </span>
                    <span className="bg-background text-muted rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                      {LINK_CATEGORY_LABELS[link.categoria]}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-lg font-semibold">{link.titulo}</h3>
                  {link.descricao && (
                    <p className="text-muted mt-1 flex-1 text-sm leading-5">{link.descricao}</p>
                  )}
                  <span className="text-primary group-hover:text-accent mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors">
                    Acessar
                    <ArrowUpRight
                      size={15}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Todos os acessos</h2>
          <span className="text-muted text-sm font-semibold">
            {filtered.length} {filtered.length === 1 ? 'acesso' : 'acessos'}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {(['todos', ...LINK_CATEGORY_KEYS, 'favoritos'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                filter === key
                  ? 'border-primary bg-primary text-white'
                  : 'border-border text-muted hover:border-accent hover:text-foreground',
              )}
            >
              {key === 'todos'
                ? 'Todos'
                : key === 'favoritos'
                  ? 'Favoritos'
                  : LINK_CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={22} />}
            title="Nenhum acesso encontrado"
            description="Tente buscar por outro termo ou selecione uma categoria diferente."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((link) => {
              const Icon = CATEGORY_ICON[link.categoria];
              const isFavorite = favoriteIds.has(link.id);
              return (
                <div
                  key={link.id}
                  className="border-border hover:border-accent bg-surface flex min-w-0 flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-colors hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="bg-background text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon size={18} strokeWidth={1.7} />
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(link.id)}
                      aria-label={
                        isFavorite
                          ? `Remover ${link.titulo} dos favoritos`
                          : `Adicionar ${link.titulo} aos favoritos`
                      }
                      className={cn(
                        'rounded-lg p-1.5 transition-colors',
                        isFavorite ? 'text-accent' : 'text-muted hover:text-accent',
                      )}
                    >
                      <Star size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <a
                    href={link.url}
                    target={link.tipoAcesso === 'externo' ? '_blank' : undefined}
                    rel={link.tipoAcesso === 'externo' ? 'noreferrer' : undefined}
                    className="group flex min-w-0 flex-1 flex-col gap-1"
                  >
                    <div className="text-accent flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                      <span className="truncate">{LINK_CATEGORY_LABELS[link.categoria]}</span>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-current" />
                      <span className="shrink-0">{LINK_ACCESS_TYPE_LABELS[link.tipoAcesso]}</span>
                    </div>
                    <h3 className="group-hover:text-accent line-clamp-2 text-sm font-semibold transition-colors">
                      {link.titulo}
                    </h3>
                    {link.descricao && (
                      <p className="text-muted line-clamp-2 text-xs leading-5">{link.descricao}</p>
                    )}
                    <p className="text-muted mt-auto flex min-w-0 items-center gap-1.5 truncate pt-2 text-[11px]">
                      {link.tipoAcesso === 'interno' ? (
                        <Link2 size={12} className="shrink-0" />
                      ) : (
                        <ArrowUpRight size={12} className="shrink-0" />
                      )}
                      <span className="truncate">
                        {link.tipoAcesso === 'interno' ? 'portal.vl6' : hostnameOf(link.url)}
                      </span>
                    </p>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SuggestLinkCard />
    </div>
  );
}
