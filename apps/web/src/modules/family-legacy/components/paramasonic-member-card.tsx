import type { ParamasonicMemberDirectoryDTO } from '@vl6/domain';
import { Briefcase, Card, MapPin, ShieldCheck } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';

export function ParamasonicMemberCard({ member }: { member: ParamasonicMemberDirectoryDTO }) {
  const professional = member.profissao ?? member.areaAtuacao;

  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <MemberAvatar
          fotoUrl={member.fotoUrl}
          nome={member.nomeCompleto}
          className="h-14 w-14 shrink-0"
        />
        <div className="min-w-0">
          <h3 className="font-display line-clamp-2 font-semibold">{member.nomeCompleto}</h3>
          <p className="text-muted mt-1 flex items-center gap-1 text-xs">
            <ShieldCheck size={13} />
            {member.cargoAtual ?? 'Membro da Verdadeira Luz nº 06'}
          </p>
        </div>
      </div>

      {member.apresentacao && (
        <p className="text-muted line-clamp-3 text-sm leading-6">{member.apresentacao}</p>
      )}

      <div className="mt-auto flex flex-col gap-1.5 pt-1">
        {professional && (
          <p className="text-muted flex items-center gap-1.5 text-sm">
            <Briefcase size={14} />
            <span className="truncate">{professional}</span>
          </p>
        )}
        {member.cidadeExibicao && (
          <p className="text-muted flex items-center gap-1.5 text-sm">
            <MapPin size={14} />
            <span className="truncate">{member.cidadeExibicao}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
