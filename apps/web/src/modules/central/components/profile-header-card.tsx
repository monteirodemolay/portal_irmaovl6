import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import {
  Briefcase,
  Building2,
  Card,
  CardContent,
  CalendarDays,
  Compass,
  Cross,
  MapPin,
  Sparkles,
  Star,
  Tag,
} from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { formatDate, getCurrentAssignment } from './profile-shared';

/**
 * Cabeçalho institucional do Perfil único — sempre visível acima das
 * seções empilhadas do perfil, extraído de `PublicMemberProfileView` na
 * unificação Acervo/Diretório (Fase 2). Avatar, nome, grau, badges de
 * situação/trajetória e os vínculos rápidos (profissão, negócios,
 * competências, interesses) que antes viviam soltos no topo da página.
 */
export function ProfileHeaderCard({
  profile,
  isOwnProfile = false,
}: {
  profile: PublicMemberProfileDTO;
  isOwnProfile?: boolean;
}) {
  const current = getCurrentAssignment(profile.trajetoria);
  const dataIniciacao = profile.trajetoria?.dataIniciacao ?? profile.dataIniciacao;
  const isInMemoriam = profile.situacao === 'falecido';
  // Um Irmão em In Memoriam nunca tem acesso próprio ao Portal (situação
  // terminal) — ignora `isOwnProfile` de propósito, em vez de confiar que a
  // sessão nunca vai mandar os dois juntos.
  const canEdit = isOwnProfile && !isInMemoriam;

  const hasResumoProfissional = Boolean(profile.profissional?.resumoProfissional);
  const hasNegocios = Boolean(profile.negocios && profile.negocios.length > 0);
  const hasCompetenciasServicos = Boolean(
    (profile.competencias && profile.competencias.length > 0) ||
    (profile.servicos && profile.servicos.length > 0),
  );
  const interesses = profile.informacoesPessoais?.interesses ?? null;
  // Negócio Principal (marcado pelo próprio Irmão em Meu Espaço) vem
  // primeiro e ganha um estilo em destaque.
  const orderedNegocios = [...(profile.negocios ?? [])].sort(
    (a, b) => Number(b.principal ?? false) - Number(a.principal ?? false),
  );

  return (
    <Card className="overflow-hidden">
      <div className="from-primary to-primary-dark relative h-24 bg-gradient-to-br sm:h-28">
        {isInMemoriam && (
          <span className="bg-surface/90 text-primary-dark absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm">
            <Cross size={13} strokeWidth={1.75} className="text-accent" />
            In Memoriam
          </span>
        )}
      </div>
      <CardContent className="flex flex-col gap-4 px-6 pb-6 pt-0 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <MemberAvatar
            fotoUrl={profile.fotoUrl}
            nome={profile.nomeCompleto}
            className="border-surface -mt-12 h-24 w-24 border-4 shadow-md sm:-mt-14 sm:h-28 sm:w-28"
            imgClassName="object-top"
          />
          {canEdit && (
            <Link
              href="/irmaos/meu-espaco"
              className="border-border bg-surface hover:border-primary hover:text-primary flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            >
              Editar meu perfil
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-display text-2xl font-semibold sm:text-[28px]">
            {profile.nomeCompleto}
          </p>
          <MemberDegreeBadge grau={profile.grau} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {profile.informacoesPessoais?.cidadeExibicao && (
            <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
              <MapPin size={13} strokeWidth={1.75} />
              {profile.informacoesPessoais.cidadeExibicao}
            </span>
          )}
          {dataIniciacao && (
            <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
              <CalendarDays size={13} strokeWidth={1.75} />
              Iniciado em {formatDate(dataIniciacao)}
            </span>
          )}
          {current && (
            <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
              <Compass size={13} strokeWidth={1.75} />
              {current.label}
            </span>
          )}
          {current && (
            <span className="bg-accent/15 text-primary-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
              Gestão {current.gestaoNome}
            </span>
          )}
          {isInMemoriam && profile.dataFalecimento && (
            <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
              <Cross size={13} strokeWidth={1.75} />
              Faleceu em {formatDate(profile.dataFalecimento)}
            </span>
          )}
        </div>

        {(hasResumoProfissional || hasNegocios || hasCompetenciasServicos || interesses) && (
          <div className="border-border flex flex-col gap-2 border-t pt-4">
            {(hasResumoProfissional || hasNegocios) && (
              <div className="flex flex-wrap gap-2">
                {hasResumoProfissional && profile.profissional?.resumoProfissional && (
                  <span className="border-border bg-background text-foreground flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                    <Briefcase size={13} strokeWidth={1.75} className="text-accent shrink-0" />
                    <span className="truncate">{profile.profissional.resumoProfissional}</span>
                  </span>
                )}
                {orderedNegocios.map((negocio) => (
                  <Link
                    key={negocio.id}
                    href={`/irmaos/negocios/${negocio.id}`}
                    className={
                      negocio.principal
                        ? 'bg-accent/15 text-primary-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:brightness-95'
                        : 'border-border bg-background hover:border-primary hover:text-primary flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'
                    }
                  >
                    {negocio.principal ? (
                      <Star size={13} strokeWidth={1.75} className="shrink-0" />
                    ) : (
                      <Building2 size={13} strokeWidth={1.75} className="text-accent shrink-0" />
                    )}
                    {negocio.nomeEmpresa}
                  </Link>
                ))}
              </div>
            )}
            {hasCompetenciasServicos && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag size={13} strokeWidth={1.75} className="text-muted shrink-0" />
                {[...(profile.competencias ?? []), ...(profile.servicos ?? [])].map((tag) => (
                  <span
                    key={tag}
                    className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {interesses && (
              <div className="text-muted flex items-center gap-1.5 text-xs">
                <Sparkles size={13} strokeWidth={1.75} className="shrink-0" />
                {interesses}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
