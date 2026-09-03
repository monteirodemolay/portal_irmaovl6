import type { ComponentType } from 'react';
import Link from 'next/link';
import { BookOpen, Card, cn, Compass, Download, FileText, Image as GalleryIcon } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';

interface AcervoTile {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  gradient: string;
  count: number | null;
  unit: string;
  /** Sobrescreve a linha de contagem — usado por blocos sem um número que faça sentido (ex.: Constelação). */
  description?: string;
}

function AcervoTileCard({ tile }: { tile: AcervoTile }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        'group relative flex h-28 flex-col justify-end overflow-hidden rounded-lg bg-gradient-to-br p-3 text-white shadow-sm',
        tile.gradient,
      )}
    >
      <tile.icon
        size={44}
        strokeWidth={1}
        className="pointer-events-none absolute -right-2 -top-2 text-white/25 transition-transform group-hover:scale-105"
      />
      <p className="font-display relative text-sm font-semibold">{tile.label}</p>
      <p className="relative text-xs text-white/75">
        {tile.description ?? (tile.count === null ? '—' : `${tile.count} ${tile.unit}`)}
      </p>
    </Link>
  );
}

/**
 * Contagens reais (nunca inventadas) — cada uma vem de um `countByTenant`
 * agregado no servidor (mesmo padrão de `admin/page.tsx`), exceto Favoritos
 * (lista pessoal pequena, contada via `ListMyFavoritesUseCase`). Álbuns de
 * Fotografias, não fotos individuais — `GalleryMedia` não tem `tenantId`
 * próprio pra contar direto sem uma varredura por álbum.
 */
export function AcervoPanel({
  documentos,
  biblioteca,
  albuns,
  favoritos,
  showConstellation,
}: {
  documentos: number | null;
  biblioteca: number | null;
  albuns: number | null;
  favoritos: number | null;
  /** `archiveRelation:read` — mesmo gate de `/acervo/constelacao`. */
  showConstellation: boolean;
}) {
  const tiles: AcervoTile[] = [
    {
      href: '/acervo/documentos',
      label: 'Documentos',
      icon: FileText,
      gradient: 'from-primary to-primary-dark',
      count: documentos,
      unit: documentos === 1 ? 'documento' : 'documentos',
    },
    {
      href: '/acervo/biblioteca',
      label: 'Biblioteca',
      icon: BookOpen,
      gradient: 'from-emerald-700 to-emerald-900',
      count: biblioteca,
      unit: biblioteca === 1 ? 'item' : 'itens',
    },
    {
      href: '/acervo/fotografias',
      label: 'Fotografias',
      icon: GalleryIcon,
      gradient: 'from-amber-600 to-amber-800',
      count: albuns,
      unit: albuns === 1 ? 'álbum' : 'álbuns',
    },
    {
      href: '/downloads',
      label: 'Favoritos',
      icon: Download,
      gradient: 'from-rose-700 to-rose-900',
      count: favoritos,
      unit: favoritos === 1 ? 'item' : 'itens',
    },
    ...(showConstellation
      ? [
          {
            href: '/acervo/constelacao',
            label: 'Constelação da Memória',
            icon: Compass,
            gradient: 'from-violet-700 to-violet-900',
            count: null,
            unit: '',
            description: 'Explore os vínculos da sua trajetória',
          } satisfies AcervoTile,
        ]
      : []),
  ];

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={BookOpen}
        title="Acervo VL6"
        href="/acervo"
        hrefLabel="Ver acervo completo"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <AcervoTileCard key={tile.href} tile={tile} />
        ))}
      </div>
    </Card>
  );
}
