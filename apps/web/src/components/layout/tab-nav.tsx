'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@vl6/ui';

export interface TabNavItem {
  href: string;
  label: string;
}

function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra de abas horizontal para sub-navegação dentro de uma área admin
 * consolidada (ex.: `/admin/pessoas`). Vive em `apps/web`, não em
 * `packages/ui`, pelo mesmo motivo do `AppShell`: depende de `next/link`/
 * `usePathname`, e o design system é framework-agnostic. Mesma regra de
 * "ativo" do `AppShell.isActive` — quem chama (`AreaTabNav`) já filtra
 * `items` pela permissão da sessão antes de passar aqui.
 */
export function TabNav({ items }: { items: TabNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sub-navegação"
      className="border-border block w-full max-w-full overflow-x-auto whitespace-nowrap border-b"
    >
      {items.map((item) => {
        const active = isTabActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'mr-1 inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors last:mr-0',
              active
                ? 'border-primary text-primary'
                : 'text-muted hover:text-foreground border-transparent',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
