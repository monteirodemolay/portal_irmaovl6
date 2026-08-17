'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, cn } from '@vl6/ui';
import { useAgendaOptional } from '@/modules/agenda/components/agenda-provider';

export interface AppShellNavItem {
  href: string;
  /** Ícone + rótulo já compostos (evita passar referência de componente através da fronteira RSC). */
  content: React.ReactNode;
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
  // Só existe dentro do Portal (`AgendaProvider` montado em `(member)/layout.tsx`);
  // em `/admin` fica `null` e o item "Agenda" da sidebar se comporta como um
  // link normal. Ver docs/architecture — drawer global da Agenda.
  const agenda = useAgendaOptional();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  }

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
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  if (item.href === '/agenda' && agenda) {
                    event.preventDefault();
                    setMobileOpen(false);
                    agenda.openAgenda();
                  }
                }}
                className={cn(
                  'my-0.5 flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm text-white/90 transition-colors',
                  isActive(item.href)
                    ? 'bg-accent text-primary-dark font-semibold'
                    : 'hover:bg-white/10',
                )}
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
              className="text-foreground hover:bg-background rounded p-2 lg:hidden"
            >
              <Menu size={20} />
            </button>
            {topbarLeft}
          </div>
          <div className="flex items-center gap-3">{topbarRight}</div>
        </header>

        <main className="mx-auto max-w-[1220px] px-5 py-6 lg:px-7 lg:py-8 print:max-w-none print:p-0">
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
          <div className="from-primary to-primary-dark absolute inset-y-0 left-0 flex w-[270px] flex-col overflow-hidden bg-gradient-to-b shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
              {brand}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="shrink-0 rounded p-1 text-white/80 hover:bg-white/10"
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
