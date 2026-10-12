'use client';

import { useState } from 'react';
import type { Announcement } from '@vl6/domain';
import { AlertTriangle, ChevronRight, Badge, Card, Megaphone, Pin } from '@vl6/ui';
import { sortHomeAnnouncements } from '../lib/home-editorial-selection';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { AnnouncementDrawer } from './announcement-drawer';

function formatExpiration(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

/** Todos os avisos vigentes permanecem na inicial, independentemente de gerar notificações. */
export function AvisosCard({ announcements }: { announcements: Announcement[] }) {
  const sorted = sortHomeAnnouncements(announcements);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  function openNotice(id: string | null) {
    setSelectedId(id);
    setOpen(true);
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-5 shadow-none">
        <DashboardSectionHeading
          icon={Megaphone}
          title="Avisos Importantes"
          action={
            <button
              type="button"
              onClick={() => openNotice(null)}
              className="text-accent shrink-0 text-xs font-medium hover:underline"
            >
              Ver todos
            </button>
          }
        />
        {sorted.length === 0 ? (
          <p className="text-muted text-sm">Nenhum aviso no momento.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map((announcement, index) => (
              <li key={announcement.id}>
                <button
                  type="button"
                  onClick={() => openNotice(announcement.id)}
                  className={
                    index === 0
                      ? 'relative flex w-full flex-col gap-2 overflow-hidden rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-left'
                      : 'border-border hover:bg-background flex w-full flex-col gap-1.5 rounded-lg border p-3.5 text-left'
                  }
                >
                  {index === 0 && (
                    <AlertTriangle
                      size={72}
                      strokeWidth={1}
                      className="pointer-events-none absolute -bottom-4 -right-4 text-red-200/50"
                    />
                  )}
                  <span className="relative flex flex-wrap items-center gap-2">
                    <Badge variant={index === 0 ? 'destructive' : 'outline'}>
                      {index === 0 ? 'Aviso importante' : 'Aviso da Loja'}
                    </Badge>
                    {announcement.destacar && (
                      <span className="text-muted flex items-center gap-1 text-xs">
                        <Pin size={12} />
                        Fixado
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      index === 0
                        ? 'relative break-words text-sm font-semibold text-red-900'
                        : 'break-words text-sm font-semibold'
                    }
                  >
                    {announcement.titulo}
                  </span>
                  <span className="text-muted relative line-clamp-2 break-words text-xs">
                    {announcement.descricao}
                  </span>
                  {announcement.dataExpiracao && (
                    <span className="text-muted relative text-xs">
                      Encerra em {formatExpiration(announcement.dataExpiracao)}
                    </span>
                  )}
                  <span className="relative mt-1 flex items-center gap-1 text-xs font-medium">
                    Ler aviso completo
                    <ChevronRight size={12} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <AnnouncementDrawer
        announcements={sorted}
        open={open}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
