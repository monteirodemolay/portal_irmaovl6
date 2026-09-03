import Link from 'next/link';
import type { Member } from '@vl6/domain';
import { calculateProfileCompletion, type MemberCentralProfile } from '@vl6/domain';
import { Card, CardContent, Eye, Heart, Settings } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

/**
 * Cartão pessoal resumido no topo da Comunidade VL6 — substitui a antiga aba
 * "Meu Espaço" como ponto de entrada principal pra ver/editar o próprio
 * perfil (documento de referência, "Cartão pessoal resumido"). Usa os
 * mesmos dados já lidos pra `SpaceHeader`/`CompletionRing`, sem nenhuma
 * leitura adicional além do que a página principal já busca.
 */
export function PersonalSummaryCard({
  member,
  profile,
  profilePublished,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  profilePublished: boolean;
}) {
  const completion = calculateProfileCompletion(member, profile);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <MemberAvatar fotoUrl={member.fotoUrl} nome={member.nomeCompleto} className="h-14 w-14" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold">{member.nomeCompleto}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <MemberDegreeBadge grau={member.grau} compact />
              <span
                className={
                  profilePublished
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800'
                    : 'bg-background text-muted rounded-full px-2 py-0.5 text-[11px] font-semibold'
                }
              >
                {profilePublished ? 'Perfil publicado' : 'Perfil não publicado'}
              </span>
              <span
                className="text-muted text-[11px]"
                title="Estimativa de preenchimento do perfil pessoal — não é obrigatório completar."
              >
                {completion}% completo*
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/irmaos/${member.id}`}
            className="border-border hover:border-primary hover:text-primary flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          >
            <Eye size={14} strokeWidth={1.75} />
            Ver meu perfil
          </Link>
          <Link
            href="/irmaos/meu-espaco?tab=pessoal"
            className="border-border hover:border-primary hover:text-primary flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          >
            <Heart size={14} strokeWidth={1.75} />
            Família e Legado
          </Link>
          <Link
            href="/irmaos/meu-espaco"
            className="bg-primary flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Settings size={14} strokeWidth={1.75} />
            Editar informações
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
