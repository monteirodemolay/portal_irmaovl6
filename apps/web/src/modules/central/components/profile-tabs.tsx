'use client';

import { useState, type ReactNode } from 'react';

export interface ProfileTabDef {
  key: string;
  label: string;
}

/**
 * Abas do Perfil único do Irmão (Fase 2 — unificação Acervo/Diretório,
 * mock-up "Trajetória e Honrarias"): Visão Geral / Trajetória e Honrarias /
 * Família e Legado / Acervo. `children` já vem renderizado por aba (mapa
 * `key -> ReactNode`, cada valor pode ser conteúdo de Server Component
 * passado de cima — troca de aba é só troca de visibilidade no client,
 * nunca refetch) — `initialTab` decide qual abre primeiro (ex.: link direto
 * `/irmaos/[id]?aba=acervo`, herdado do antigo `/acervo/pessoas/[id]`).
 */
export function ProfileTabs({
  tabs,
  initialTab,
  children,
}: {
  tabs: ProfileTabDef[];
  initialTab: string;
  children: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(
    tabs.some((tab) => tab.key === initialTab) ? initialTab : (tabs[0]?.key ?? initialTab),
  );

  return (
    <div className="flex flex-col gap-6">
      <nav
        className="border-border bg-surface flex gap-1 overflow-x-auto rounded-xl border p-1"
        aria-label="Seções do perfil"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={
              active === tab.key
                ? 'bg-primary shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white'
                : 'text-muted hover:text-foreground hover:bg-background shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {children[active]}
    </div>
  );
}
