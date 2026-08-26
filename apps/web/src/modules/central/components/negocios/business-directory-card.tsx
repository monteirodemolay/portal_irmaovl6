import Link from 'next/link';
import type { BusinessDirectoryEntryDTO } from '@vl6/domain';
import { FORMA_ATENDIMENTO_LABELS } from '@vl6/shared';
import { Building2, Card, CardContent, Clock, Gift, MapPin } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';

function BusinessLogo({ logoUrl, nomeEmpresa }: { logoUrl: string | null; nomeEmpresa: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo de ${nomeEmpresa}`}
        className="bg-background h-11 w-11 shrink-0 rounded-lg object-contain p-1"
      />
    );
  }
  return (
    <span className="bg-background text-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
      <Building2 size={20} strokeWidth={1.75} />
    </span>
  );
}

export function BusinessDirectoryCard({ entry }: { entry: BusinessDirectoryEntryDTO }) {
  return (
    <Card className="hover:border-primary h-full transition-colors hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <BusinessLogo logoUrl={entry.logoUrl} nomeEmpresa={entry.nomeEmpresa} />
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium leading-snug">{entry.nomeEmpresa}</p>
            {entry.segmento && <p className="text-muted text-xs">{entry.segmento}</p>}
          </div>
        </div>

        {entry.descricao && <p className="text-muted line-clamp-2 text-sm">{entry.descricao}</p>}

        {entry.produtosServicos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.produtosServicos.slice(0, 4).map((item) => (
              <span
                key={item}
                className="bg-accent/15 text-primary-dark rounded-full px-2 py-0.5 text-[11px] font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="text-muted flex flex-col gap-1 text-sm">
          {entry.cidade && (
            <p className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{entry.cidade}</span>
            </p>
          )}
          {entry.formasAtendimento.length > 0 && (
            <p className="truncate text-xs">
              {entry.formasAtendimento.map((key) => FORMA_ATENDIMENTO_LABELS[key]).join(' · ')}
            </p>
          )}
          {entry.horarioFuncionamento && (
            <p className="flex items-center gap-1.5 text-xs">
              <Clock size={13} className="shrink-0" />
              <span className="truncate">{entry.horarioFuncionamento}</span>
            </p>
          )}
        </div>

        {entry.ofereceDescontoIrmaos && (
          <p className="bg-primary/10 text-primary-dark flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium">
            <Gift size={14} className="mt-0.5 shrink-0" />
            <span>{entry.descontoDescricao || 'Condição especial para Irmãos'}</span>
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
