import Link from 'next/link';
import type { DirectoryMemberDTO } from '@vl6/domain';
import { Briefcase, Building2, Card, ChevronRight, LodgeTenureBadge, MapPin } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { SituacaoBadge } from '@/modules/membership/components/situacao/situacao-badge';

/**
 * Cartão amplo do Irmão na Comunidade VL6 unificada — todo Irmão
 * institucional não excluído aparece (regra central desta fase), publicado
 * ou não. Cargo/comissão são institucionais (sempre exibidos quando
 * existem, não dependem de publicação); profissão/negócio/competências só
 * aparecem quando `profileState === 'published'`. Falecidos recebem
 * tratamento "In memoriam" — respeitoso, sem qualquer afordância de contato
 * atual.
 */
export function CommunityMemberCard({ profile }: { profile: DirectoryMemberDTO }) {
  const isFalecido = profile.situacao === 'falecido';
  const tags = [
    ...(profile.optional.competencias ?? []),
    ...(profile.optional.servicos ?? []),
  ].slice(0, 3);
  const profissaoOuArea =
    profile.optional.profissional?.profissao ?? profile.optional.profissional?.areaAtuacao;
  const empresa = profile.optional.empresaAtual ?? profile.optional.negocios?.[0]?.nomeEmpresa;
  const cidade = profile.optional.cidadeExibicao;
  const cargoOuComissao = profile.cargoAtual ?? profile.comissoes[0]?.nome ?? null;

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
                {profile.situacao !== 'ativo' && <SituacaoBadge situacao={profile.situacao} />}
              </div>
              <p className="text-muted text-xs">
                {isFalecido ? 'In memoriam' : (cargoOuComissao ?? 'Irmão do Quadro')}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted mt-1 shrink-0" />
        </div>

        {!isFalecido && (
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
        )}

        {!isFalecido && tags.length > 0 && (
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
