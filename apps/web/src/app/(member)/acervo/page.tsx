import Link from 'next/link';
import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Compass,
  FileText,
  Heart,
  History,
  Image as GalleryIcon,
  Landmark,
  PageHero,
  Search,
  Share2,
  Users,
} from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import {
  ARCHIVE_SEARCH_KIND_LABELS,
  ARCHIVE_SEARCH_KINDS,
  loadArchiveSearchResults,
  matchesArchiveSearch,
  type ArchiveSearchKind,
  type ArchiveSearchResult,
} from '@/modules/archive/lib/search-archive';
import {
  loadPublishedArchiveDocuments,
  loadPublishedArchiveEventCards,
} from '@/modules/archive/lib/load-published-archive-events';

function formatCount(value: number | null, singular: string, plural: string): string {
  if (value === null) return 'Acesso conforme sua permissão';
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatShortDate(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function resultIcon(kind: ArchiveSearchKind) {
  if (kind === 'documento') return FileText;
  if (kind === 'biblioteca') return BookOpen;
  if (kind === 'fotografia') return GalleryIcon;
  if (kind === 'noticia') return FileText;
  return CalendarDays;
}

function ArchiveResultImage({
  result,
  featured = false,
}: {
  result: ArchiveSearchResult;
  featured?: boolean;
}) {
  const KindIcon = resultIcon(result.kind);
  return result.imageUrl ? (
    <img
      src={result.imageUrl}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  ) : (
    <div className="from-primary to-primary-dark flex h-full w-full flex-col justify-between bg-gradient-to-br p-4 text-white">
      <KindIcon size={featured ? 24 : 18} strokeWidth={1.5} className="text-accent" />
      <p className={`font-display font-semibold leading-tight ${featured ? 'text-xl' : 'text-sm'}`}>
        {result.title}
      </p>
    </div>
  );
}

export default async function AcervoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const [session, current, params] = await Promise.all([
    getCurrentSession(),
    getCurrentTenant(),
    searchParams,
  ]);
  if (!session || !current) return null;

  const { authContext, role } = session;
  const canReadFiles = hasPermission(authContext, 'file:read');
  const canReadLibrary = hasPermission(authContext, 'libraryItem:read');
  const canReadGallery = hasPermission(authContext, 'gallery:read');
  const canReadCollections = hasPermission(authContext, 'archiveCollection:read');
  const canReadConstellation = hasPermission(authContext, 'archiveRelation:read');
  const canManageHeroPhoto = hasPermission(authContext, 'tenant:manage');
  const heroPhoto = resolveHeroPhoto(current.tenant, 'acervo');
  const container = createServerContainer();

  const [
    allResults,
    favorites,
    legacyDocumentCount,
    libraryCount,
    legacyAlbumCount,
    archiveDocuments,
    archiveEventCards,
    collections,
    constellationRoots,
  ] = await Promise.all([
    loadArchiveSearchResults(authContext, container, role),
    canReadLibrary ? container.useCases.listMyFavorites.execute(authContext) : Promise.resolve([]),
    canReadFiles
      ? container.repositories.fileAsset.countByTenant(authContext.tenantId)
      : Promise.resolve(null),
    canReadLibrary
      ? container.repositories.libraryItem.countByTenant(authContext.tenantId)
      : Promise.resolve(null),
    canReadGallery
      ? container.repositories.galleryAlbum.countByTenant(authContext.tenantId)
      : Promise.resolve(null),
    canReadFiles
      ? loadPublishedArchiveDocuments(container, authContext, role)
      : Promise.resolve([]),
    canReadGallery
      ? loadPublishedArchiveEventCards(container, authContext, role)
      : Promise.resolve([]),
    canReadCollections
      ? container.useCases.listPublishedArchiveCollections.execute(authContext)
      : Promise.resolve([]),
    canReadConstellation
      ? container.useCases.getConstellationRoots.execute(authContext)
      : Promise.resolve(null),
  ]);

  const documentCount =
    legacyDocumentCount === null ? null : legacyDocumentCount + archiveDocuments.length;
  const publishedEventAlbumCount = archiveEventCards.filter(
    (card) => card.counts.foto + card.counts.video > 0,
  ).length;
  const albumCount = legacyAlbumCount === null ? null : legacyAlbumCount + publishedEventAlbumCount;

  const query = params.q?.trim() ?? '';
  const requestedKind = params.tipo as ArchiveSearchKind | undefined;
  const validKind =
    requestedKind && ARCHIVE_SEARCH_KINDS.includes(requestedKind) ? requestedKind : undefined;
  const filteredResults = allResults
    .filter((result) => !validKind || result.kind === validKind)
    .filter((result) => matchesArchiveSearch(result, query));
  const recentResults = [...allResults].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const featuredResult =
    recentResults.find((result) => result.imageUrl) ?? recentResults[0] ?? null;
  const discoveryResults = (query || validKind ? filteredResults : recentResults)
    .filter((result) => result.compositeId !== featuredResult?.compositeId)
    .slice(0, 3);

  const fullSearchParams = new URLSearchParams();
  if (query) fullSearchParams.set('q', query);
  if (validKind) fullSearchParams.set('tipo', validKind);
  const fullSearchHref = `/acervo/pesquisar${fullSearchParams.size ? `?${fullSearchParams}` : ''}`;

  const explorePaths = [
    {
      href: '/acervo/linha-do-tempo',
      title: 'Linha do tempo',
      description: 'Gestões e acontecimentos por ano.',
      icon: History,
    },
    {
      href: '/acervo/eventos',
      title: 'Eventos',
      description: 'Sessões, solenidades e ações.',
      icon: CalendarDays,
    },
    {
      href: '/acervo/gestoes',
      title: 'Gestões',
      description: 'Veneráveis e Diretorias.',
      icon: Landmark,
    },
    {
      href: '/acervo/pessoas',
      title: 'Pessoas',
      description: 'Trajetórias e presença histórica.',
      icon: Users,
    },
    {
      href: '/acervo/descobrir',
      title: 'Descobrir',
      description: 'Temas e registros relacionados.',
      icon: Compass,
    },
  ];

  const contentAreas = [
    {
      href: '/acervo/documentos',
      title: 'Documentos',
      count: formatCount(documentCount, 'arquivo', 'arquivos'),
      icon: FileText,
      available: canReadFiles,
    },
    {
      href: '/acervo/biblioteca',
      title: 'Biblioteca',
      count: formatCount(libraryCount, 'item', 'itens'),
      icon: BookOpen,
      available: canReadLibrary,
    },
    {
      href: '/acervo/fotografias',
      title: 'Fotos e vídeos',
      count: formatCount(albumCount, 'álbum', 'álbuns'),
      icon: GalleryIcon,
      available: canReadGallery,
    },
    {
      href: '/downloads',
      title: 'Favoritos',
      count: formatCount(favorites.length, 'item', 'itens'),
      icon: Heart,
      available: canReadLibrary,
    },
  ].filter((area) => area.available);

  return (
    <div className="flex flex-col gap-8">
      <PageHero
        kicker="Centro digital de memória"
        title={`Encontre a história da ${current.tenant.nome}`}
        description="Pesquise pessoas, gestões, eventos, fotografias, atas, livros e documentos em um único lugar."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          <div className="flex w-full flex-col gap-4">
            <form action="/acervo/pesquisar" method="get" role="search">
              <label htmlFor="archive-search" className="sr-only">
                Pesquisar no Acervo VL6
              </label>
              <div className="flex max-w-3xl flex-col gap-2 sm:flex-row">
                <div className="focus-within:ring-accent focus-within:ring-offset-primary flex min-w-0 flex-1 items-center gap-3 rounded-[10px] bg-white px-4 shadow-md focus-within:ring-2 focus-within:ring-offset-2">
                  <Search className="text-primary/60 shrink-0" size={20} />
                  <input
                    id="archive-search"
                    name="q"
                    defaultValue={query}
                    placeholder="Busque por nome, ano, evento, gestão ou documento"
                    className="text-primary-dark min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-accent text-primary-dark hover:bg-accent/90 rounded-[10px] px-5 py-3 text-sm font-semibold transition-colors"
                >
                  Pesquisar no Acervo
                </button>
              </div>
            </form>
            <nav aria-label="Atalhos do Acervo" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <Link href="/acervo/colecoes" className="text-white/70 hover:text-white">
                Coleções
              </Link>
              <Link href="/acervo/exposicoes" className="text-white/70 hover:text-white">
                Exposições
              </Link>
              <Link href="/acervo/audiovisual" className="text-white/70 hover:text-white">
                Audiovisual
              </Link>
              <Link href="/acervo/contribuir" className="text-white/70 hover:text-white">
                Contribuir com a memória
              </Link>
            </nav>
            {canManageHeroPhoto && (
              <PageHeroPhotoUpload
                pageKey="acervo"
                path="/acervo"
                hasPhoto={Boolean(heroPhoto)}
                initialPosicao={heroPhoto?.posicao ?? 50}
              />
            )}
          </div>
        }
      />

      <section aria-labelledby="explore-title">
        <div className="mb-4">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
            Caminhos de exploração
          </p>
          <h2 id="explore-title" className="font-display text-2xl font-semibold">
            Como você quer conhecer o Acervo?
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {explorePaths.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="border-border bg-surface hover:border-accent group flex min-h-36 flex-col rounded-[15px] border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <path.icon className="text-accent" size={21} strokeWidth={1.6} />
              <h3 className="font-display mt-4 font-semibold">{path.title}</h3>
              <p className="text-muted mt-1 text-xs leading-5">{path.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured-title" className="grid gap-4 lg:grid-cols-[1.55fr_0.75fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
                Em destaque
              </p>
              <h2 id="featured-title" className="font-display text-2xl font-semibold">
                Memória em evidência
              </h2>
            </div>
            <Link
              href="/acervo/descobrir"
              className="text-muted hover:text-accent text-xs font-medium"
            >
              Descobrir mais
            </Link>
          </div>
          {featuredResult ? (
            <Link
              href={featuredResult.href}
              className="border-border bg-surface hover:border-accent group grid overflow-hidden rounded-[18px] border shadow-sm transition-colors sm:grid-cols-[0.9fr_1.1fr]"
            >
              <div className="min-h-52 overflow-hidden sm:min-h-72">
                <ArchiveResultImage result={featuredResult} featured />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-7">
                <p className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                  {ARCHIVE_SEARCH_KIND_LABELS[featuredResult.kind]}
                </p>
                <h3 className="font-display mt-2 text-2xl font-semibold leading-tight">
                  {featuredResult.title}
                </h3>
                <p className="text-muted mt-3 line-clamp-3 text-sm leading-6">
                  {featuredResult.description}
                </p>
                <span className="text-primary mt-5 inline-flex items-center gap-1.5 text-xs font-semibold">
                  Abrir memória completa <ChevronRight size={15} />
                </span>
              </div>
            </Link>
          ) : (
            <div className="border-border bg-surface rounded-[18px] border p-8">
              <Archive className="text-accent" size={27} />
              <h3 className="font-display mt-4 text-xl font-semibold">
                O Acervo está pronto para receber memórias
              </h3>
              <p className="text-muted mt-2 text-sm">
                Conteúdos publicados aparecerão aqui em destaque.
              </p>
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-3 lg:pt-[68px]">
          {canReadConstellation && (
            <Link
              href="/acervo/constelacao"
              className="from-primary to-primary-dark group flex flex-1 flex-col justify-between rounded-[17px] bg-gradient-to-br p-5 text-white shadow-sm"
            >
              <Share2 className="text-accent" size={23} />
              <div className="mt-8">
                <p className="text-accent text-[10px] font-semibold uppercase tracking-widest">
                  Relações e laços
                </p>
                <h3 className="font-display mt-2 text-xl font-semibold">Constelação VL6</h3>
                <p className="mt-2 text-xs leading-5 text-white/65">
                  Explore como pessoas, gestões, eventos, coleções e documentos se conectam.
                </p>
                {constellationRoots && constellationRoots.groups.length > 0 && (
                  <p className="mt-4 text-[11px] text-white/55">
                    {constellationRoots.groups.reduce(
                      (total, group) => total + group.childCount,
                      0,
                    )}{' '}
                    registros disponíveis para explorar
                  </p>
                )}
              </div>
            </Link>
          )}
          <Link
            href="/acervo/pessoas"
            className="border-border bg-surface hover:border-accent rounded-[17px] border p-5 shadow-sm transition-colors"
          >
            <Users className="text-accent" size={21} />
            <h3 className="font-display mt-4 font-semibold">Pessoas e trajetórias</h3>
            <p className="text-muted mt-1 text-xs leading-5">
              Veja onde cada Irmão aparece na memória da Loja.
            </p>
          </Link>
        </aside>
      </section>

      {collections.length > 0 && (
        <section aria-labelledby="collections-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
                Curadoria do Acervo
              </p>
              <h2 id="collections-title" className="font-display text-2xl font-semibold">
                Coleções para começar
              </h2>
            </div>
            <Link
              href="/acervo/colecoes"
              className="text-muted hover:text-accent text-xs font-medium"
            >
              Todas as coleções
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {collections.slice(0, 4).map((collection) => (
              <Link
                key={collection.id}
                href={`/acervo/colecoes/${collection.slug}`}
                className="border-border bg-surface hover:border-accent group overflow-hidden rounded-[16px] border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="from-primary to-primary-dark h-32 overflow-hidden bg-gradient-to-br">
                  {collection.capaUrl ? (
                    <img
                      src={collection.capaUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-end p-4">
                      <Compass className="text-accent" size={26} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold">{collection.titulo}</h3>
                  {collection.descricaoEditorial && (
                    <p className="text-muted mt-1 line-clamp-2 text-xs leading-5">
                      {collection.descricaoEditorial}
                    </p>
                  )}
                  <p className="text-muted mt-3 text-[11px]">
                    {collection.itemIds.length}{' '}
                    {collection.itemIds.length === 1 ? 'item relacionado' : 'itens relacionados'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="content-title">
        <div className="mb-4">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
            Tipos de conteúdo
          </p>
          <h2 id="content-title" className="font-display text-2xl font-semibold">
            Acesse diretamente
          </h2>
        </div>
        <div className="border-border bg-surface grid overflow-hidden rounded-[17px] border sm:grid-cols-2 lg:grid-cols-4">
          {contentAreas.map((area, index) => (
            <Link
              key={area.href}
              href={area.href}
              className={`hover:bg-primary/[0.03] group flex items-center gap-4 p-5 transition-colors ${index > 0 ? 'border-border border-t sm:border-l sm:border-t-0' : ''}`}
            >
              <span className="bg-primary/5 text-primary group-hover:bg-primary group-hover:text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] transition-colors">
                <area.icon size={21} strokeWidth={1.6} />
              </span>
              <span className="min-w-0">
                <strong className="font-display block font-semibold">{area.title}</strong>
                <small className="text-muted mt-0.5 block truncate text-[11px]">{area.count}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-title" className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-border bg-surface rounded-[18px] border p-5 sm:p-6">
          <div className="border-border flex items-end justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
                Atualizações do Acervo
              </p>
              <h2 id="recent-title" className="font-display text-2xl font-semibold">
                Adicionados recentemente
              </h2>
            </div>
            <Link
              href="/acervo/descobrir"
              className="text-muted hover:text-accent text-xs font-medium"
            >
              Explorar tudo
            </Link>
          </div>
          <div className="divide-border mt-1 divide-y">
            {recentResults.slice(0, 4).map((result) => {
              const KindIcon = resultIcon(result.kind);
              return (
                <Link
                  key={result.compositeId}
                  href={result.href}
                  className="group grid grid-cols-[72px_1fr] items-center gap-4 py-3 sm:grid-cols-[82px_1fr_auto]"
                >
                  <div className="border-border h-14 overflow-hidden rounded-[9px] border">
                    <ArchiveResultImage result={result} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display group-hover:text-accent truncate font-semibold transition-colors">
                      {result.title}
                    </p>
                    <p className="text-muted mt-1 flex items-center gap-1.5 text-[11px]">
                      <KindIcon size={12} /> {ARCHIVE_SEARCH_KIND_LABELS[result.kind]} ·{' '}
                      {formatShortDate(result.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="text-muted hidden sm:block" size={17} />
                </Link>
              );
            })}
            {recentResults.length === 0 && (
              <p className="text-muted py-8 text-center text-sm">
                Nenhum conteúdo publicado ainda.
              </p>
            )}
          </div>
        </div>

        <aside className="border-border bg-surface rounded-[18px] border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
                Pesquisa integrada
              </p>
              <h2 className="font-display text-xl font-semibold">
                {query ? `Resultados para “${query}”` : 'Descubra mais registros'}
              </h2>
            </div>
            <Search className="text-accent" size={22} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por tipo">
            {ARCHIVE_SEARCH_KINDS.map((kind) => (
              <Link
                key={kind}
                href={`/acervo?tipo=${kind}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${validKind === kind ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-accent hover:text-foreground'}`}
              >
                {ARCHIVE_SEARCH_KIND_LABELS[kind]}
              </Link>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {discoveryResults.map((result) => (
              <Link
                key={result.compositeId}
                href={result.href}
                className="border-border hover:border-accent group block border-l-2 pl-3"
              >
                <p className="font-display group-hover:text-accent line-clamp-1 font-semibold transition-colors">
                  {result.title}
                </p>
                <p className="text-muted mt-0.5 line-clamp-1 text-[11px]">{result.description}</p>
              </Link>
            ))}
          </div>
          <Link
            href={fullSearchHref}
            className="border-border text-primary hover:border-accent mt-6 flex items-center justify-between rounded-[10px] border px-4 py-3 text-xs font-semibold"
          >
            Ver pesquisa completa <ChevronRight size={16} />
          </Link>
        </aside>
      </section>
    </div>
  );
}
