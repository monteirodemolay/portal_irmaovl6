import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { Briefcase, Building2, Card, CardContent, ChevronRight } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

export function MemberDirectoryCard({ profile }: { profile: PublicMemberProfileDTO }) {
  const tags = [...(profile.competencias ?? []), ...(profile.servicos ?? [])].slice(0, 2);
  const profissaoOuArea = profile.profissional?.profissao ?? profile.profissional?.areaAtuacao;
  const empresa = profile.empresaAtual ?? profile.negocios?.[0]?.nomeEmpresa;

  return (
    <Link href={`/irmaos/${profile.memberId}`} className="group">
      <Card className="hover:border-primary h-full transition-colors hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <MemberAvatar
                fotoUrl={profile.fotoUrl}
                nome={profile.nomeCompleto}
                className="h-12 w-12"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate font-medium">{profile.nomeCompleto}</p>
                <MemberDegreeBadge grau={profile.grau} compact />
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-muted group-hover:text-primary mt-1 shrink-0 transition-colors"
            />
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
        </CardContent>
      </Card>
    </Link>
  );
}
