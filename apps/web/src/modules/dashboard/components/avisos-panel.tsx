import type { Announcement } from '@vl6/domain';
import { Card, Megaphone } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';

export function AvisosPanel({ announcements }: { announcements: Announcement[] }) {
  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={Megaphone}
        title="Avisos recentes"
        href="/avisos"
        hrefLabel="Ver todos"
      />
      {announcements.length === 0 ? (
        <p className="text-muted text-sm">Nenhum aviso no momento.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.slice(0, 4).map((announcement) => (
            <li
              key={announcement.id}
              className="border-border flex gap-3 border-b pb-3 last:border-0 last:pb-0"
            >
              <span className="bg-accent/15 text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Megaphone size={16} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{announcement.titulo}</p>
                <p className="text-muted line-clamp-1 text-xs">{announcement.descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
