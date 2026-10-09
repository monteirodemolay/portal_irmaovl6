'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHero, cn } from '@vl6/ui';

export interface AdminWorkspaceNavItem {
  href: string;
  label: string;
  description?: string;
  exact?: boolean;
}

function isActive(pathname: string, item: AdminWorkspaceNavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Casca visual única das áreas administrativas.
 *
 * Segue o padrão da Gestão do Conhecimento: uma identidade de área persistente,
 * navegação interna curta e o conteúdo da operação mudando abaixo dela. As rotas
 * continuam existindo para URL, histórico do navegador e RBAC, mas deixam de
 * parecer aplicações independentes.
 */
export function AdminWorkspaceShell({
  kicker = 'Administração autorizada',
  title,
  description,
  items,
  children,
}: {
  kicker?: string;
  title: string;
  description: string;
  items: AdminWorkspaceNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const matches = items
    .filter((item) => isActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length);
  const activeHref = matches[0]?.href;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHero kicker={kicker} title={title} description={description} />
      <nav
        aria-label={`Navegação interna de ${title}`}
        className="border-border bg-surface flex max-w-full gap-1 overflow-x-auto rounded-2xl border p-1.5 shadow-sm"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activeHref === item.href ? 'page' : undefined}
            title={item.description}
            className={cn(
              'whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              activeHref === item.href
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
