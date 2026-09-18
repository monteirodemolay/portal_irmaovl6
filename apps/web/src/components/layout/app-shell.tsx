'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
}

export interface AppShellNavItem {
  href: string;
  /** Ícone + rótulo já compostos (evita passar referência de componente através da fronteira RSC). */
  content: React.ReactNode;
  /**
   * Áreas com várias telas internas (abas) ganham um menu deslizante de
   * atalhos ao lado do item, em vez de levar direto pra tela cheia — evita
   * a pessoa entrar num lugar que não precisa só pra escolher a aba certa.
   * Itens simples (uma tela só) não definem isso e continuam navegando direto.
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
 * escondido só por CSS). Client Component só pelo estado do menu mobile —
 * o conteúdo em si (brand/sections/topbar) é montado no servidor e injetado
 * via props/children, então nenhuma consulta ao Firestore roda no client.
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
  const [openFlyout, setOpenFlyout] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const flyoutButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);

  const itemsByHref = useMemo(() => {
    const map = new Map<string, AppShellNavItem>();
    for (const section of sections) {
      for (const item of section.items) map.set(item.href, item);
    }
    return map;
  }, [sections]);

  useEffect(() => {
    setMobileOpen(false);
    setOpenFlyout(null);
    setExpandedMobile(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen && !openFlyout) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setOpenFlyout(null);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, openFlyout]);

  useEffect(() => {
    if (!openFlyout) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const panel = flyoutPanelRef.current;
      const trigger = flyoutButtonRefs.current[openFlyout ?? ''];
      if (panel?.contains(target) || trigger?.contains(target)) return;
      setOpenFlyout(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openFlyout]);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  }

  function toggleFlyout(href: string) {
    if (openFlyout === href) {
      setOpenFlyout(null);
      return;
    }
    const trigger = flyoutButtonRefs.current[href];
    if (trigger) {
      setFlyoutTop(trigger.getBoundingClientRect().top);
    }
    setOpenFlyout(href);
  }

  const itemLinkClass = (active: boolean) =>
    cn(
      'focus-visible:ring-accent focus-visible:ring-offset-primary my-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      active ? 'bg-accent text-primary-dark font-semibold' : 'hover:bg-white/10',
    );

  function renderNav(variant: 'desktop' | 'mobile') {
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

              if (variant === 'desktop') {
                return (
                  <button
                    key={item.href}
                    type="button"
                    ref={(el) => {
                      flyoutButtonRefs.current[item.href] = el;
                    }}
                    onClick={() => toggleFlyout(item.href)}
                    aria-expanded={openFlyout === item.href}
                    className={itemLinkClass(active || openFlyout === item.href)}
                  >
                    {item.content}
                    <ChevronRight
                      size={15}
                      className={cn(
                        'shrink-0 opacity-60 transition-transform',
                        openFlyout === item.href && 'rotate-90',
                      )}
                    />
                  </button>
                );
              }

              const isExpanded = expandedMobile === item.href;
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => setExpandedMobile(isExpanded ? null : item.href)}
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
                      {item.flyout.full && (
                        <Link
                          href={item.flyout.full.href}
                          className="text-accent flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold hover:underline"
                        >
                          {item.flyout.full.label}
                          <ChevronRight size={14} />
                        </Link>
                      )}
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

  const openFlyoutItem = openFlyout ? itemsByHref.get(openFlyout) : undefined;

  return (
    <div className="min-h-screen print:block">
      <aside className="from-primary to-primary-dark fixed inset-y-0 left-0 z-10 hidden w-[260px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b lg:flex print:hidden">
        <div className="border-b border-white/10 px-5 py-5">{brand}</div>
        {renderNav('desktop')}
        {sidebarFooter && <div className="border-t border-white/10 px-5 py-4">{sidebarFooter}</div>}
      </aside>

      {openFlyout && openFlyoutItem?.flyout && (
        <>
          <div
            className="fixed inset-0 z-20 hidden bg-black/5 lg:block"
            onClick={() => setOpenFlyout(null)}
            aria-hidden="true"
          />
          <div
            ref={flyoutPanelRef}
            role="menu"
            style={{
              top: Math.min(flyoutTop, typeof window === 'undefined' ? 0 : window.innerHeight - 24),
            }}
            className="border-border bg-surface fixed left-[260px] z-30 hidden w-[300px] flex-col rounded-r-2xl border border-l-0 py-2 shadow-md lg:flex print:hidden"
          >
            <div className="px-4 pb-2 pt-1">
              <p className="font-display text-foreground text-[15px] font-semibold">
                {openFlyoutItem.flyout.title}
              </p>
              {openFlyoutItem.flyout.description && (
                <p className="text-muted mt-0.5 text-xs">{openFlyoutItem.flyout.description}</p>
              )}
            </div>
            <div className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto px-2">
              {openFlyoutItem.flyout.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground hover:bg-background flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors"
                >
                  <span>{link.label}</span>
                  {link.hint && <span className="text-muted text-xs">{link.hint}</span>}
                </Link>
              ))}
            </div>
            {openFlyoutItem.flyout.full && (
              <>
                <div className="border-border mx-2 my-2 border-t" />
                <Link
                  href={openFlyoutItem.flyout.full.href}
                  className="text-primary mx-2 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold hover:underline"
                >
                  {openFlyoutItem.flyout.full.label}
                  <ChevronRight size={15} />
                </Link>
              </>
            )}
          </div>
        </>
      )}

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
          <div className="from-primary to-primary-dark absolute inset-y-0 left-0 flex w-[270px] flex-col overflow-hidden bg-gradient-to-b shadow-md">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
              {brand}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="focus-visible:ring-accent shrink-0 rounded p-1 text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <X size={20} />
              </button>
            </div>
            {renderNav('mobile')}
            {sidebarFooter && (
              <div className="border-t border-white/10 px-5 py-4">{sidebarFooter}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
