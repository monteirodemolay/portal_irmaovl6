'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationOrigin } from './context-link';
import type { NavigationOrigin } from '@/lib/navigation/context';
import { resolveActiveNavigation } from '@/lib/navigation/navigation-selection';
import { ModuleNavigation } from './module-navigation';
import { Menu, X, cn } from '@vl6/ui';

export interface AppShellModuleNavigation {
  title: string;
  description?: string;
  links: { href: string; label: string; hint?: string; activePaths?: string[] }[];
  overview?: { href: string; label: string };
}

export interface AppShellNavItem {
  href: string;
  activePaths?: string[];
  content: React.ReactNode;
  /** Internal sections live above the content, never inside the sidebar. */
  navigation?: AppShellModuleNavigation;
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
 * o conteúdo em si (brand/sections/topbar) é montado no
 * servidor e injetado via props/children, então nenhuma consulta ao
 * Firestore roda no client.
 */
function AppShellContent({
  brand,
  sections,
  sidebarFooter,
  topbarLeft,
  topbarRight,
  children,
  origin,
}: AppShellProps & { origin: NavigationOrigin | null }) {
  const pathname = usePathname();
  const activePath = origin?.module ?? pathname;
  const activeItem = resolveActiveNavigation(sections.flatMap((section) => section.items), activePath);

  useEffect(() => {
    try {
      const href = window.location.pathname + window.location.search + window.location.hash;
      if (sessionStorage.getItem('vl6:restore') !== href) return;
      sessionStorage.removeItem('vl6:restore');
      const position = Number(sessionStorage.getItem('vl6:return:' + href) ?? 0);
      const frame = requestAnimationFrame(() => window.scrollTo(0, position));
      return () => cancelAnimationFrame(frame);
    } catch {
      /* Navigation works without browser storage. */
    }
  }, [pathname]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Trava o scroll do fundo e prende o foco dentro do drawer enquanto ele
  // está aberto — sem isso o conteúdo por trás rolava junto (double-scroll)
  // e o Tab escapava do menu pro conteúdo escondido atrás dele.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      previousFocus?.focus();
    };
  }, [mobileOpen]);

  const itemLinkClass = (active: boolean) =>
    cn(
      'focus-visible:ring-accent focus-visible:ring-offset-primary my-0.5 flex min-h-11 w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left text-sm text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      active ? 'bg-accent text-primary-dark font-semibold' : 'hover:bg-white/10',
    );

  function renderNav() {
    return (
      <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-4 py-2 [scrollbar-gutter:stable]">
        {sections.map((section, index) => (
          <div key={section.title ?? index} className="mb-1">
            {section.title && (
              <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeItem?.href === item.href ? 'page' : undefined}
                className={itemLinkClass(activeItem?.href === item.href)}
                onClick={() => setMobileOpen(false)}
              >
                {item.content}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen print:block">
      <a href="#portal-content" className="bg-surface text-foreground sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-3">Ir para o conteúdo</a>
      <aside className="from-primary to-primary-dark fixed inset-y-0 left-0 z-10 hidden w-[288px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b lg:flex print:hidden">
        <div className="border-b border-white/10 px-5 py-5">{brand}</div>
        {renderNav()}
        {sidebarFooter && <div className="border-t border-white/10 px-5 py-4">{sidebarFooter}</div>}
      </aside>

      <div className="min-w-0 lg:pl-[288px] print:pl-0">
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

        {activeItem?.navigation && (
          <ModuleNavigation
            navigation={activeItem.navigation}
            pathname={origin?.href ?? pathname}
          />
        )}
        <main id="portal-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-5 py-6 lg:px-9 lg:py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobilePanelRef}
            className="from-primary to-primary-dark absolute inset-y-0 left-0 flex w-[min(88vw,320px)] max-w-[calc(100vw-12px)] flex-col overflow-hidden bg-gradient-to-b shadow-md"
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

function AppShellWithOrigin(props: AppShellProps) {
  const origin = useNavigationOrigin();
  return <AppShellContent {...props} origin={origin} />;
}

export function AppShell(props: AppShellProps) {
  return (
    <Suspense fallback={<AppShellContent {...props} origin={null} />}>
      <AppShellWithOrigin {...props} />
    </Suspense>
  );
}
