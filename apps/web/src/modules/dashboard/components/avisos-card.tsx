import type { Announcement, AnnouncementPriority } from '@vl6/domain';
import { AlertTriangle, Badge, Card, Megaphone, Pin } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';

const PRIORITY_ORDER: Record<AnnouncementPriority, number> = { alta: 0, media: 1, baixa: 2 };

function formatExpiration(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(date);
}

function sortByPriority(announcements: Announcement[]): Announcement[] {
  return [...announcements].sort((a, b) => {
    if (a.destacar !== b.destacar) return a.destacar ? -1 : 1;
    return PRIORITY_ORDER[a.prioridade] - PRIORITY_ORDER[b.prioridade];
  });
}

/**
 * Um único card de Avisos — antes dividido em dois (`ImportantNoticeCard`
 * separado + `AvisosPanel`), o que duplicava a área de "avisos" na tela.
 * O mais prioritário (destacado ou prioridade alta) aparece primeiro, com
 * destaque visual; os demais seguem em ordem de prioridade decrescente na
 * mesma lista.
 */
export function AvisosCard({ announcements }: { announcements: Announcement[] }) {
  const sorted = sortByPriority(announcements);
  const [featured, ...rest] = sorted;

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={Megaphone}
        title="Avisos"
        href="/avisos"
        hrefLabel="Ver todos"
      />
      {!featured ? (
        <p className="text-muted text-sm">Nenhum aviso no momento.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          <AvisoItem announcement={featured} destacado />
          {rest.slice(0, 3).map((announcement) => (
            <AvisoItem key={announcement.id} announcement={announcement} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AvisoItem({
  announcement,
  destacado = false,
}: {
  announcement: Announcement;
  destacado?: boolean;
}) {
  if (destacado) {
    return (
      <li className="relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-red-200 bg-red-50/70 p-3.5">
        <AlertTriangle
          size={72}
          strokeWidth={1}
          className="pointer-events-none absolute -bottom-4 -right-4 text-red-200/50"
        />
        <div className="relative flex items-center gap-2">
          <Badge variant="destructive">Aviso importante</Badge>
          {announcement.destacar && (
            <span className="text-muted flex items-center gap-1 text-xs">
              <Pin size={12} strokeWidth={1.75} /> Fixado
            </span>
          )}
        </div>
        <p className="relative text-sm font-semibold text-red-900">{announcement.titulo}</p>
        <p className="text-muted relative line-clamp-2 text-xs">{announcement.descricao}</p>
        {announcement.dataExpiracao && (
          <p className="relative text-xs text-red-700">
            Encerra em {formatExpiration(announcement.dataExpiracao)}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="border-border flex gap-3 border-b pb-3 last:border-0 last:pb-0">
      <span className="bg-accent/15 text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Megaphone size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{announcement.titulo}</p>
        <p className="text-muted line-clamp-1 text-xs">{announcement.descricao}</p>
        {announcement.dataExpiracao && (
          <p className="text-muted mt-0.5 text-xs">
            Encerra em {formatExpiration(announcement.dataExpiracao)}
          </p>
        )}
      </div>
    </li>
  );
}
