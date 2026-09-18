'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, Select } from '@vl6/ui';

interface NavItem {
  href: string;
  label: string;
}
interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    key: 'catalogo',
    label: 'Catálogo',
    items: [
      { href: '/admin/acervo/biblioteca', label: 'Obras' },
      { href: '/admin/acervo/biblioteca/estantes', label: 'Estantes' },
      { href: '/admin/acervo/biblioteca/etiquetas', label: 'Etiquetas QR' },
    ],
  },
  {
    key: 'circulacao',
    label: 'Circulação',
    items: [
      { href: '/admin/acervo/biblioteca/emprestimo-presencial', label: 'Balcão' },
      { href: '/admin/acervo/biblioteca/emprestimos', label: 'Fila de empréstimos' },
      { href: '/admin/acervo/biblioteca/baixas', label: 'Baixas e ocorrências' },
    ],
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    items: [{ href: '/admin/acervo/biblioteca/downloads', label: 'Downloads' }],
  },
];

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sub-navegação do módulo Biblioteca, agrupada em Catálogo/Circulação/Relatórios —
 * substitui a fileira de botões soltos que existia no topo do Catálogo
 * (ver plano de reorganização). Ativa por grupo + item usando o casamento mais
 * específico (maior href), mesma regra do `TabNav` genérico.
 */
export function LibraryAdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const match = GROUPS.flatMap((group) => group.items.map((item) => ({ group, item })))
    .filter(({ item }) => isActiveHref(pathname, item.href))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0];
  const activeGroup = match?.group ?? GROUPS[0]!;
  const activeHref = match?.item.href;

  return (
    <div className="grid gap-2">
      <div className="md:hidden">
        <label
          className="text-muted mb-1.5 block text-xs font-medium"
          htmlFor="library-admin-section"
        >
          Seção da Biblioteca
        </label>
        <Select
          id="library-admin-section"
          aria-label="Selecionar seção da Biblioteca"
          value={activeHref ?? GROUPS[0]!.items[0]!.href}
          onChange={(event) => router.push(event.target.value)}
          className="w-full"
        >
          {GROUPS.map((group) => (
            <optgroup key={group.key} label={group.label}>
              {group.items.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <nav aria-label="Áreas da Biblioteca" className="hidden gap-1 md:flex">
        {GROUPS.map((group) => {
          const isActiveGroup = group.key === activeGroup.key;
          return (
            <Link
              key={group.key}
              href={group.items[0]!.href}
              aria-current={isActiveGroup ? 'page' : undefined}
              className={cn(
                'rounded-t-md border-b-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                isActiveGroup
                  ? 'border-primary text-primary'
                  : 'text-muted hover:text-foreground border-transparent',
              )}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>
      <nav
        aria-label="Sub-navegação da Biblioteca"
        className="border-border hidden w-full max-w-full overflow-x-auto whitespace-nowrap border-b md:block"
      >
        {activeGroup.items.map((item) => {
          const isActiveItem = item.href === (activeHref ?? activeGroup.items[0]!.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActiveItem ? 'page' : undefined}
              className={cn(
                'mr-1 inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors last:mr-0',
                isActiveItem
                  ? 'border-primary text-primary'
                  : 'text-muted hover:text-foreground border-transparent',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
