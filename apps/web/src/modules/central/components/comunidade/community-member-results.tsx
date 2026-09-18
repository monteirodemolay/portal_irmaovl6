'use client';

import { useState } from 'react';
import type { DirectoryMemberDTO } from '@vl6/domain';
import { LayoutGrid, LayoutList } from '@vl6/ui';
import { CommunityMemberCard } from './community-member-card';

type ViewMode = 'grid' | 'list';

/**
 * Alternância Grade/Lista dos cartões de Irmão (mock-up "view"/"Grade"/
 * "Lista") — estado local, não persiste em URL (não é um filtro, é só
 * preferência de exibição desta sessão de navegação). Negócios continuam
 * só em grade, como no mock-up.
 */
export function CommunityMemberResults({ items }: { items: DirectoryMemberDTO[] }) {
  const [view, setView] = useState<ViewMode>('grid');

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Irmãos</h2>
        <div
          role="group"
          aria-label="Visualização dos Irmãos"
          className="border-border bg-surface inline-flex rounded-lg border p-0.5"
        >
          <button
            type="button"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
            className={
              view === 'grid'
                ? 'bg-primary flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white'
                : 'text-muted hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium'
            }
          >
            <LayoutGrid size={14} strokeWidth={1.75} />
            Grade
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
            className={
              view === 'list'
                ? 'bg-primary flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white'
                : 'text-muted hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium'
            }
          >
            <LayoutList size={14} strokeWidth={1.75} />
            Lista
          </button>
        </div>
      </div>

      <div
        className={
          view === 'grid' ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : 'flex flex-col gap-3'
        }
      >
        {items.map((profile) => (
          <CommunityMemberCard key={profile.memberId} profile={profile} variant={view} />
        ))}
      </div>
    </section>
  );
}
