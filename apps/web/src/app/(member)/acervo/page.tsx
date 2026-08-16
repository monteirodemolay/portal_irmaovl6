import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Compass,
  FileText,
  Heart,
  Image as GalleryIcon,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from '@vl6/ui';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

type ArchiveKind = 'documento' | 'biblioteca' | 'fotografia';

interface ArchiveResult {
  id: string;
  kind: ArchiveKind;
  title: string;
  description: string;
  href: string;
}

const KIND_LABELS: Record<ArchiveKind, string> = {
  documento: 'Documento',
  biblioteca: 'Biblioteca',
  fotografia: 'Fotografia',
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matches(result: ArchiveResult, query: string): boolean {
  if (!query) return true;
  const haystack = normalize(`${result.title} ${result.description} ${KIND_LABELS[result.kind]}`);
  return haystack.includes(normalize(query));
}

function formatCount(value: number | null, singular: string, plural: string): string {
  if (value === null) return 'Acesso conforme sua permissão';
  return `${value} ${value === 1 ? singular : plural}`;
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

  const { authContext } = session;
  const canReadFiles = hasPermission(authContext, 'file:read');
  const canReadLibrary = hasPermission(authContext, 'libraryItem:read');
  const canReadGallery = hasPermission(authContext, 'gallery:read');
  const container = createServerContainer();

  const [filesPage, libraryItems, albums, favorites, documentCount, libraryCount, albumCount] =
    await Promise.all([
      canReadFiles || canReadLibrary
        ? container.useCases.listAllFileAssets.execute(authContext, { limit: 200 })
        : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
      canReadLibrary
        ? container.repositories.libraryItem.listByTenant(authContext.tenantId)
        : Promise.resolve([]),
      canReadGallery
        ? container.useCases.listGalleryAlbums.execute(authContext)
        : Promise.resolve([]),
      canReadLibrary
        ? container.useCases.listMyFavorites.execute(authContext)
        : Promise.resolve([]),
      canReadFiles
        ? container.repositories.fileAsset.countByTenant(authContext.tenantId)
        : Promise.resolve(null),
      canReadLibrary
        ? container.repositories.libraryItem.countByTenant(authContext.tenantId)
        : Promise.resolve(null),
      canReadGallery
        ? container.repositories.galleryAlbum.countByTenant(authContext.tenantId)
        : Promise.resolve(null),
    ]);

  const fileById = new Map(filesPage.items.map((file) => [file.id, file]));
  const libraryFileIds = new Set(libraryItems.map((item) => item.fileId));

  const documentResults: ArchiveResult[] = filesPage.items
    .filter((file) => file.publicado && !libraryFileIds.has(file.id))
    .map((file) => ({
      id: file.id,
      kind: 'documento',
      title: file.titulo,
      description: file.descricao || 'Documento institucional do Acervo VL6.',
      href: `/api/files/${file.id}`,
    }));

  const libraryResults: ArchiveResult[] = libraryItems.flatMap((item) => {
    const file = fileById.get(item.fileId);
    if (!file) return [];
    return [
      {
        id: item.id,
        kind: 'biblioteca' as const,
        title: file.titulo,
        description: file.descricao || 'Estudo e leitura selecionada para os Irmãos.',
        href: `/api/library-items/${item.id}`,
      },
    ];
  });

  const galleryResults: ArchiveResult[] = albums.map((album) => ({
    id: album.id,
    kind: 'fotografia',
    title: album.titulo,
    description: `${album.categoria} · registro fotográfico da Loja`,
    href: `/galeria/${album.id}`,
  }));

  const query = params.q?.trim() ?? '';
  const requestedKind = params.tipo as ArchiveKind | undefined;
  const validKind = requestedKind && requestedKind in KIND_LABELS ? requestedKind : undefined;
  const allResults = [...documentResults, ...libraryResults, ...galleryResults];
  const filteredResults = allResults
    .filter((result) => !validKind || result.kind === validKind)
    .filter((result) => matches(result, query));
  const visibleResults = (query || validKind ? filteredResults : allResults).slice(0, 12);

  const categories = [
    {
      href: '/arquivos',
      title: 'Documentos',
      description: 'Atas autorizadas, circulares, registros e documentos institucionais.',
      count: formatCount(documentCount, 'arquivo', 'arquivos'),
      icon: FileText,
      available: canReadFiles,
    },
    {
      href: '/biblioteca',
      title: 'Biblioteca',
      description: 'Livros, estudos, revistas e leituras selecionadas para os Irmãos.',
      count: formatCount(libraryCount, 'item', 'itens'),
      icon: BookOpen,
      available: canReadLibrary,
    },
    {
      href: '/galeria',
      title: 'Fotografias',
      description: 'Álbuns de sessões, solenidades e acontecimentos da Loja.',
      count: formatCount(albumCount, 'álbum', 'álbuns'),
      icon: GalleryIcon,
      available: canReadGallery,
    },
    {
      href: '/downloads',
      title: 'Favoritos',
      description: 'Sua seleção pessoal de conteúdos para consultar novamente.',
      count: formatCount(favorites.length, 'item', 'itens'),
      icon: Heart,
      available: canReadLibrary,
    },
  ];

  return (
    <div className="flex flex-col gap-9">
      <section className="from-primary via-primary to-primary-dark relative overflow-hidden rounded-[22px] bg-gradient-to-br px-6 py-9 text-white shadow-md sm:px-9 lg:px-12 lg:py-12">
        <div className="border-accent/20 pointer-events-none absolute -right-28 -top-36 h-80 w-80 rounded-full border" />
        <div className="border-accent/10 pointer-events-none absolute -right-12 -top-20 h-80 w-80 rounded-full border" />
        <div className="bg-accent/10 pointer-events-none absolute bottom-0 right-0 h-40 w-64 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="text-accent mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]">
            <Compass size={17} strokeWidth={1.6} />
            Memória, História e Conhecimento
          </div>
          <h1 className="font-display text-4xl font-semibold leading-none sm:text-5xl">
            Acervo VL6
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            Um único centro de pesquisa para documentos, fotografias, biblioteca e registros que
            preservam a trajetória da {current.tenant.nome}.
          </p>

          <form action="/acervo" method="get" role="search" className="mt-7">
            {validKind && <input type="hidden" name="tipo" value={validKind} />}
            <label htmlFor="archive-search" className="sr-only">
              Pesquisar no Acervo VL6
            </label>
            <div className="flex max-w-2xl items-center gap-3 rounded-[14px] border border-white/15 bg-white px-4 py-1.5 shadow-lg">
              <Search className="text-primary/65 shrink-0" size={21} />
              <input
                id="archive-search"
                name="q"
                defaultValue={query}
                placeholder="Pesquise títulos, assuntos ou tipos de conteúdo..."
                className="text-primary-dark min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark rounded-[9px] px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                Pesquisar
              </button>
            </div>
          </form>

          <div className="mt-6 flex max-w-2xl items-start gap-3 border-l border-white/20 pl-4">
            <Quote className="text-accent mt-0.5 shrink-0" size={18} />
            <p className="font-display text-sm italic leading-6 text-white/80 sm:text-base">
              “Preservar a memória é manter acesa a Luz que orienta as gerações.”
              <span className="font-body mt-1 block text-[10px] uppercase not-italic tracking-wider text-white/45">
                Manifesto do Acervo VL6
              </span>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="explore-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
              Um acervo, diferentes caminhos
            </p>
            <h2 id="explore-title" className="font-display text-2xl font-semibold">
              Explore o Acervo
            </h2>
          </div>
          <p className="text-muted hidden max-w-md text-right text-xs leading-5 md:block">
            As áreas atuais permanecem disponíveis e passam a integrar uma única experiência de
            pesquisa e descoberta.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categories
            .filter((category) => category.available)
            .map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="border-border bg-surface hover:border-accent group flex min-h-48 flex-col rounded-[16px] border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="bg-primary/5 text-primary group-hover:bg-primary group-hover:text-accent flex h-11 w-11 items-center justify-center rounded-[12px] transition-colors">
                  <category.icon size={22} strokeWidth={1.6} />
                </div>
                <h3 className="font-display mt-5 text-lg font-semibold">{category.title}</h3>
                <p className="text-muted mt-1 flex-1 text-xs leading-5">{category.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted">{category.count}</span>
                  <ChevronRight
                    size={17}
                    className="text-accent transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section aria-labelledby="research-title" className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="border-border bg-surface rounded-[18px] border p-5 sm:p-6">
          <div className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
                Pesquisa integrada
              </p>
              <h2 id="research-title" className="font-display text-2xl font-semibold">
                {query ? `Resultados para “${query}”` : 'Conteúdos para descobrir'}
              </h2>
            </div>
            {(query || validKind) && (
              <Link href="/acervo" className="text-muted hover:text-accent text-xs font-medium">
                Limpar pesquisa
              </Link>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por tipo">
            {(['documento', 'biblioteca', 'fotografia'] as const).map((kind) => (
              <Link
                key={kind}
                href={`/acervo?tipo=${kind}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  validKind === kind
                    ? 'border-primary bg-primary text-white'
                    : 'border-border text-muted hover:border-accent hover:text-foreground'
                }`}
              >
                {KIND_LABELS[kind]}
              </Link>
            ))}
          </div>

          {visibleResults.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="text-muted mx-auto" size={28} strokeWidth={1.4} />
              <p className="font-display mt-3 text-lg font-semibold">Nenhum conteúdo encontrado</p>
              <p className="text-muted mt-1 text-sm">
                Tente outro termo ou consulte uma das áreas do Acervo.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {visibleResults.map((result) => (
                <Link
                  key={`${result.kind}-${result.id}`}
                  href={result.href}
                  className="border-border hover:border-accent group rounded-[13px] border p-4 transition-colors"
                >
                  <div className="text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                    {result.kind === 'documento' && <FileText size={14} />}
                    {result.kind === 'biblioteca' && <BookOpen size={14} />}
                    {result.kind === 'fotografia' && <GalleryIcon size={14} />}
                    {KIND_LABELS[result.kind]}
                  </div>
                  <h3 className="font-display group-hover:text-accent mt-2 line-clamp-2 font-semibold transition-colors">
                    {result.title}
                  </h3>
                  <p className="text-muted mt-1 line-clamp-2 text-xs leading-5">
                    {result.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="from-primary to-primary-dark relative overflow-hidden rounded-[18px] bg-gradient-to-b p-6 text-white">
          <Sparkles className="text-accent" size={24} strokeWidth={1.5} />
          <p className="text-accent mt-6 text-[10px] font-semibold uppercase tracking-[0.2em]">
            Constelação da Memória
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold leading-tight">
            O contexto transforma um arquivo em história.
          </h2>
          <p className="mt-3 text-xs leading-5 text-white/65">
            A evolução do Acervo conectará cada registro às pessoas, gestões, acontecimentos e
            coleções que lhe dão significado.
          </p>
          <div className="mt-7 space-y-3 text-xs text-white/75">
            <div className="flex items-center gap-3">
              <Users className="text-accent" size={17} /> Pessoas e trajetórias
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="text-accent" size={17} /> Eventos e períodos históricos
            </div>
            <div className="flex items-center gap-3">
              <Compass className="text-accent" size={17} /> Coleções e linhas do tempo
            </div>
          </div>
        </aside>
      </section>

      <section className="border-border grid overflow-hidden rounded-[18px] border md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: 'Procedência',
            text: 'Origem, autoria e responsabilidade pela catalogação.',
          },
          {
            icon: Compass,
            title: 'Contexto',
            text: 'Relações históricas que dão significado a cada registro.',
          },
          {
            icon: Sparkles,
            title: 'Legado',
            text: 'Memória organizada para orientar as próximas gerações.',
          },
        ].map((principle, index) => (
          <div
            key={principle.title}
            className={`bg-surface flex gap-4 p-5 ${index > 0 ? 'border-border border-t md:border-l md:border-t-0' : ''}`}
          >
            <principle.icon className="text-accent shrink-0" size={21} strokeWidth={1.5} />
            <div>
              <h2 className="font-display font-semibold">{principle.title}</h2>
              <p className="text-muted mt-1 text-xs leading-5">{principle.text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
