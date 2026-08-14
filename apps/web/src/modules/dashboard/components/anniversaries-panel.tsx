import type { UpcomingAnniversaryEntry } from '@vl6/domain';
import { Card, Gift } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { anniversaryHeadline } from '../lib/anniversary-labels';
import { DashboardSectionHeading } from './dashboard-section-heading';

/**
 * Painel "Esta semana na Loja" — dado cadastral (iniciação/elevação/
 * exaltação/nascimento), não da Central VL6, por isso aparece pra qualquer
 * Irmão autenticado, mesmo quem nunca publicou nada no diretório.
 */
export function AnniversariesPanel({
  entries,
  showDirectoryLink,
}: {
  entries: UpcomingAnniversaryEntry[];
  showDirectoryLink: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <Card className="border-accent/40 flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={Gift}
        title="Esta semana na Loja"
        href={showDirectoryLink ? '/irmaos' : undefined}
        hrefLabel="Ver diretório completo"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={`${entry.memberId}-${entry.kind}`} className="flex items-center gap-3">
            <MemberAvatar fotoUrl={entry.fotoUrl} nome={entry.nomeCompleto} className="h-10 w-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{entry.nomeCompleto}</p>
              <p className="text-muted text-xs">{anniversaryHeadline(entry)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
