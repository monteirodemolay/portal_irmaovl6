import Link from 'next/link';
import type { BusinessDirectoryEntryDTO } from '@vl6/domain';
import { Building2, Card, CardContent, MapPin } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';

export function BusinessDirectoryCard({ entry }: { entry: BusinessDirectoryEntryDTO }) {
  return (
    <Card className="hover:border-primary h-full transition-colors hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="bg-background text-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
            <Building2 size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium leading-snug">{entry.nomeEmpresa}</p>
            {entry.segmento && <p className="text-muted text-xs">{entry.segmento}</p>}
          </div>
        </div>

        {entry.descricao && <p className="text-muted line-clamp-2 text-sm">{entry.descricao}</p>}

        {entry.cidade && (
          <p className="text-muted flex items-center gap-1.5 text-sm">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{entry.cidade}</span>
          </p>
        )}

        <Link
          href={`/irmaos/${entry.responsavel.memberId}`}
          className="border-border hover:border-primary mt-auto flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors"
        >
          <MemberAvatar
            fotoUrl={entry.responsavel.fotoUrl}
            nome={entry.responsavel.nomeCompleto}
            className="h-7 w-7"
          />
          <span className="min-w-0">
            <span className="text-muted block text-[11px] leading-none">Irmão responsável</span>
            <span className="block truncate font-medium leading-tight">
              {entry.responsavel.nomeCompleto}
            </span>
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
