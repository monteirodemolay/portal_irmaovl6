'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, X, cn } from '@vl6/ui';

export interface AppShellNavFlyoutLink {
  href: string;
  label: string;
  hint?: string;
}

export interface AppShellNavFlyout {
  title: string;
  description?: string;
  links: AppShellNavFlyoutLink[];
  full?: { href: string; label: string };
  /** Posição do link `full` na lista — `'last'` (padrão) ou `'first'`. */
  fullPosition?: 'first' | 'last';
}

export interface AppShellNavItem {
  href: string;
  /** Ícone + rótulo já compostos (evita passar referência de componente através da fronteira RSC). */
  content: React.ReactNode;
  /**
   * Áreas com várias telas internas (abas) ganham uma lista de atalhos que
   * expande logo abaixo do item na própria sidebar, em vez de levar direto
   * pra tela cheia — evita a pessoa entrar num lugar que não precisa só pra
   * escolher a aba certa. Itens simples (uma tela só) não definem isso e
   * continuam navegando direto.
   */
  flyout?: AppShellNavFlyout;
}

export interface AppShellNavSection {
  title?: string;
  items: AppShellNavItem[];
}

export interface AppShellProps {
  brand: React.ReactNode;
  sections: AppShellNavSection[];
  /** Link discreto pro site institucional, rodapé da sidebar (docs/architecture/07 §7.0). */
  sidebarFooter?: React.ReactNode;
  topbarLeft: React.ReactNode;
  topbarRight: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Casco compartilhado de sidebar + topbar — usado por `(member)/layout.tsx`
 * e `admin/layout.tsx`. Uma só implementação resolve os 3 papéis (Membro,
 * Administrador da Loja, Administrador Geral): quem chama já filtra
 * `sections` pela sessão/permissão real antes de passar aqui (nunca é
 * escondido só por CSS). Client Component só pelo estado do menu mobile e do
 * item expandido — o conteúdo em si (brand/sections/topbar) é montado no
 * servidor e injetado via props/children, então nenhuma consulta ao
 * Firestore roda no client.
 */
export function AppShell({
  brand,
  sections,
  sidebarFooter,
  topbarLeft,
  topbarRight,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedHref, setExpandedHref] = useState<string | null>(null);
  // Item ativo (numa sub-rota do próprio flyout) abre o menu por padrão,
  // mesmo sem clique — sem isso, navegar pra um item da lista (ex.:
  // "Documentos") fechava o dropdown de novo, escondendo os outros itens
  // logo depois de escolher um (pedido do Administrador). Guarda quando
  // esse padrão foi explicitamente fechado por clique, já que
  // `expandedHref` sozinho não sabia distinguir "nunca abri" de "abri e
  // fechei de novo" pra um item que já estava ativo.
  const [collapsedHref, setCollapsedHref] = useState<string | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setExpandedHref(null);
  }, [pathname]);

  // Trava o scroll do fundo e prende o foco dentro do drawer enquanto ele
  // está aberto — sem isso o conteúdo por trás rolava junto (double-scroll)
  // e o Tab escapava do menu pro conteúdo escondido atrás dele.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobileCloseButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = mobilePanelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  }

  const itemLinkClass = (active: boolean) =>
    cn(
      'focus-visible:ring-accent focus-visible:ring-offset-primary my-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      active ? 'bg-accent text-primary-dark font-semibold' : 'hover:bg-white/10',
    );

  function renderNav() {
    return (
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {sections.map((section, index) => (
          <div key={section.title ?? index} className="mb-1">
            {section.title && (
              <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href);

              if (!item.flyout) {
                return (
                  <Link key={item.href} href={item.href} className={itemLinkClass(active)}>
                    {item.content}
                  </Link>
                );
              }

              const isExpanded =
                collapsedHref === item.href ? false : expandedHref === item.href || active;
              const fullLink = item.flyout.full && (
                <Link
                  href={item.flyout.full.href}
                  className="text-accent flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold hover:underline"
                >
                  {item.flyout.full.label}
                  <ChevronRight size={14} />
                </Link>
              );
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isExpanded) {
                        setCollapsedHref(item.href);
                        setExpandedHref((current) => (current === item.href ? null : current));
                      } else {
                        setExpandedHref(item.href);
                        setCollapsedHref((current) => (current === item.href ? null : current));
                      }
                    }}
                    aria-expanded={isExpanded}
                    className={itemLinkClass(active || isExpanded)}
                  >
                    {item.content}
                    <ChevronRight
                      size={15}
                      className={cn(
                        'shrink-0 opacity-60 transition-transform',
                        isExpanded && 'rotate-90',
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                      {item.flyout.fullPosition === 'first' && fullLink}
                      {item.flyout.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="focus-visible:ring-accent flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2"
                        >
                          <span>{link.label}</span>
                          {link.hint && <span className="text-xs text-white/45">{link.hint}</span>}
                        </Link>
                      ))}
                      {item.flyout.fullPosition !== 'first' && fullLink}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen print:block">
      <aside className="from-primary to-primary-dark fixed inset-y-0 left-0 z-10 hidden w-[260px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b lg:flex print:hidden">
        <div className="border-b border-white/10 px-5 py-5">{brand}</div>
        {renderNav()}
        {sidebarFooter && <div className="border-t border-white/10 px-5 py-4">{sidebarFooter}</div>}
      </aside>

      <div className="min-w-0 lg:pl-[260px] print:pl-0">
        <header className="border-border bg-surface sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b px-5 lg:px-7 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="text-foreground hover:bg-background focus-visible:ring-accent rounded p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:hidden"
            >
              <Menu size={20} />
            </button>
            {topbarLeft}
          </div>
          <div className="flex items-center gap-3">{topbarRight}</div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-6 lg:px-9 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobilePanelRef}
            className="from-primary to-primary-dark absolute inset-y-0 left-0 flex w-[270px] flex-col overflow-hidden bg-gradient-to-b shadow-md"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
              {brand}
              <button
                ref={mobileCloseButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="focus-visible:ring-accent shrink-0 rounded p-1 text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <X size={20} />
              </button>
            </div>
            {renderNav()}
            {sidebarFooter && (
              <div className="border-t border-white/10 px-5 py-4">{sidebarFooter}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
