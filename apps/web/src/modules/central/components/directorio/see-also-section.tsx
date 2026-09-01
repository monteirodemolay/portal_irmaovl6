import Link from 'next/link';
import type { DirectoryMemberDTO } from '@vl6/domain';
import { Users } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';

/**
 * "Ver também" contextual — Fase F da conexão Acervo ⇄ Diretório
 * (docs/architecture, princípio da Cadeia de União): mesma área de atuação
 * é o elo mais direto entre dois Irmãos que ainda não se conhecem, então é
 * o primeiro critério oferecido. Nunca renderiza vazio — só aparece quando
 * há de fato outros Irmãos para sugerir.
 */
export function SeeAlsoSection({
  areaLabel,
  members,
}: {
  areaLabel: string;
  members: Pick<DirectoryMemberDTO, 'memberId' | 'nomeCompleto' | 'fotoUrl'>[];
}) {
  if (members.length === 0) return null;

  return (
    <section aria-labelledby="ver-tambem-title" className="border-border rounded-xl border p-4">
      <h2
        id="ver-tambem-title"
        className="text-muted flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
      >
        <Users size={14} strokeWidth={1.75} />
        Ver também · {areaLabel}
      </h2>
      <div className="mt-3 flex flex-col gap-1">
        {members.map((member) => (
          <Link
            key={member.memberId}
            href={`/irmaos/${member.memberId}`}
            className="hover:bg-background flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors"
          >
            <MemberAvatar fotoUrl={member.fotoUrl} nome={member.nomeCompleto} className="h-7 w-7" />
            <span className="truncate">{member.nomeCompleto}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
