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
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
  more = [],
  advancedCount = 0,
  children,
}: {
  kicker?: string;
  title: string;
  description: string;
  items: AdminWorkspaceNavItem[];
  /** Ferramentas de rotina sem aba própria, sempre acessíveis pela área. */
  more?: AdminWorkspaceNavItem[];
  /** Ferramentas desta área em Administração avançada (0 = sem link). */
  advancedCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const matches = items
    .filter((item) => isActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length);
  const activeHref = matches[0]?.href;
  const activeMore = more.find((item) => isActive(pathname, item));

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
      {more.length > 0 || advancedCount > 0 ? (
        <div className="-mt-3 flex flex-wrap items-start gap-2 print:hidden">
          {more.length > 0 ? (
            <details className="group min-w-0 flex-1" open={activeMore ? true : undefined}>
              <summary className="text-muted hover:text-foreground inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                  ›
                </span>
                Mais nesta área ({more.length})
                {activeMore ? (
                  <span className="text-foreground font-semibold">· {activeMore.label}</span>
                ) : null}
              </summary>
              <nav
                aria-label={`Mais ferramentas de ${title}`}
                className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
              >
                {more.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={activeMore?.href === item.href ? 'page' : undefined}
                    className={cn(
                      'border-border bg-surface block rounded-xl border px-3.5 py-2.5 transition-colors',
                      activeMore?.href === item.href
                        ? 'border-primary/40 shadow-sm'
                        : 'hover:border-primary/30',
                    )}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    {item.description ? (
                      <span className="text-muted mt-0.5 block text-xs leading-relaxed">
                        {item.description}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </details>
          ) : null}
          {advancedCount > 0 ? (
            <Link
              href="/admin/avancado"
              className="text-muted hover:text-foreground ml-auto inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium"
            >
              Ferramentas avançadas ({advancedCount}) →
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
