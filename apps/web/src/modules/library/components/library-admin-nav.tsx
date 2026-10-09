'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@vl6/ui';

const ITEMS = [
  { href: '/admin/acervo/biblioteca', label: 'Visão geral', exact: true },
  { href: '/admin/acervo/biblioteca/novo', label: 'Nova obra', exact: true },
  { href: '/admin/acervo/biblioteca/emprestimo-presencial', label: 'Balcão' },
  { href: '/admin/acervo/biblioteca/emprestimos', label: 'Empréstimos' },
  { href: '/admin/acervo/biblioteca/baixas', label: 'Baixas e ocorrências' },
  { href: '/admin/acervo/biblioteca/estantes', label: 'Estantes' },
  { href: '/admin/acervo/biblioteca/etiquetas', label: 'QR e etiquetas' },
  { href: '/admin/acervo/biblioteca/downloads', label: 'Relatórios' },
  { href: '/admin/acervo/biblioteca/lixeira', label: 'Lixeira' },
] as const;

function active(pathname: string, item: (typeof ITEMS)[number]): boolean {
  return 'exact' in item && item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Navegação interna única da Gestão da Biblioteca.
 * Mantém catálogo, circulação, patrimônio e relatórios no mesmo ambiente,
 * seguindo a experiência da Gestão do Conhecimento em vez de simular módulos separados.
 */
export function LibraryAdminNav() {
  const pathname = usePathname();
  const selected = [...ITEMS]
    .filter((item) => active(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav
      aria-label="Gestão da Biblioteca"
      className="border-border bg-surface flex max-w-full gap-1 overflow-x-auto rounded-2xl border p-1.5 shadow-sm"
    >
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={selected?.href === item.href ? 'page' : undefined}
          className={cn(
            'whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
            selected?.href === item.href
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted hover:bg-muted/60 hover:text-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
