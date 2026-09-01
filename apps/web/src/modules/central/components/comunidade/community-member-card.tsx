import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { Briefcase, Building2, Card, ChevronRight, LodgeTenureBadge, MapPin } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

/**
 * Cartão amplo do Irmão na Comunidade VL6 unificada — substitui o antigo
 * `MemberDirectoryCard` (que abria um drawer) por navegação de verdade pra
 * `/irmaos/[memberId]`, conforme pedido: "toda a superfície do cartão deve
 * ser clicável, acessível por teclado e possuir estado de foco visível".
 * Nunca mostra "cargo atual" de fato (a busca não carrega `trajetoria`, só
 * o perfil individual carrega — decisão deliberada de não estender o caso
 * de uso de busca pra isso agora), por isso o rótulo cai sempre em "Irmão
 * do Quadro", igual pedido pelo documento de referência como fallback.
 */
export function CommunityMemberCard({ profile }: { profile: PublicMemberProfileDTO }) {
  const tags = [...(profile.competencias ?? []), ...(profile.servicos ?? [])].slice(0, 3);
  const profissaoOuArea = profile.profissional?.profissao ?? profile.profissional?.areaAtuacao;
  const empresa = profile.empresaAtual ?? profile.negocios?.[0]?.nomeEmpresa;
  const cidade = profile.informacoesPessoais?.cidadeExibicao;

  return (
    <Card className="hover:border-primary focus-within:ring-primary h-full transition-colors focus-within:ring-2 focus-within:ring-offset-2 hover:shadow-md">
      <Link
        href={`/irmaos/${profile.memberId}`}
        className="flex h-full flex-col gap-3 rounded-[inherit] p-5 outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <MemberAvatar
              fotoUrl={profile.fotoUrl}
              nome={profile.nomeCompleto}
              className="h-14 w-14 shrink-0"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="line-clamp-2 font-medium leading-snug">{profile.nomeCompleto}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <MemberDegreeBadge grau={profile.grau} compact />
                <LodgeTenureBadge dataIniciacao={profile.dataIniciacao} />
              </div>
              <p className="text-muted text-xs">Irmão do Quadro</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted mt-1 shrink-0" />
        </div>

        <div className="flex flex-col gap-1.5">
          {profissaoOuArea && (
            <p className="text-muted flex items-center gap-1.5 text-sm">
              <Briefcase size={14} className="shrink-0" />
              <span className="truncate">{profissaoOuArea}</span>
            </p>
          )}
          {empresa && (
            <p className="text-muted flex items-center gap-1.5 text-sm">
              <Building2 size={14} className="shrink-0" />
              <span className="truncate">{empresa}</span>
            </p>
          )}
          {cidade && (
            <p className="text-muted flex items-center gap-1.5 text-sm">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{cidade}</span>
            </p>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span key={tag} className="bg-background text-muted rounded-md px-2 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </Card>
  );
}
