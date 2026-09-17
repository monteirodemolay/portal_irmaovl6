import type { PublicMemberProfileDTO } from '@vl6/domain';
import { Briefcase, Building2, Card, CardContent, Compass, MapPin, Sparkles } from '@vl6/ui';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import { formatDate, getCurrentAssignment } from '../profile-shared';

export interface ProfileSectionLink {
  id: string;
  label: string;
}

/**
 * Coluna de identidade (esquerda, sticky em telas grandes) do novo layout —
 * card-resumo com Loja/potência, "quickfacts" institucionais e o nav de
 * âncoras pras seções da coluna central (mock-up "Perfil VL6"). Nunca
 * mostra "não informado": cada quickfact só aparece se o dado existir, e o
 * card-resumo inteiro some se nem Loja nem potência estiverem disponíveis.
 */
export function ProfileIdentityRail({
  profile,
  sections,
}: {
  profile: PublicMemberProfileDTO;
  sections: ProfileSectionLink[];
}) {
  const current = getCurrentAssignment(profile.trajetoria);
  const dataIniciacao = profile.trajetoria?.dataIniciacao ?? profile.dataIniciacao;
  const profissao = profile.profissional?.profissao ?? null;

  const facts: { icon: typeof Compass; label: string; value: string }[] = [
    { icon: Compass, label: 'Grau simbólico', value: MEMBER_DEGREE_LABELS[profile.grau] },
    current?.label
      ? {
          icon: Building2,
          label: 'Cargo atual',
          value: current.gestaoNome
            ? `${current.label} — Gestão ${current.gestaoNome}`
            : current.label,
        }
      : null,
    profile.oriente ? { icon: MapPin, label: 'Oriente', value: profile.oriente } : null,
    profissao ? { icon: Briefcase, label: 'Profissão', value: profissao } : null,
    dataIniciacao
      ? { icon: Sparkles, label: 'Ingresso na Loja', value: formatDate(dataIniciacao) }
      : null,
  ].filter((fact): fact is { icon: typeof Compass; label: string; value: string } => fact !== null);

  return (
    <>
      {(profile.loja || profile.potencia) && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="border-border flex items-center gap-3 border-b pb-4">
              <div>
                {profile.loja && (
                  <p className="font-display text-sm font-semibold leading-tight">{profile.loja}</p>
                )}
                {profile.potencia && (
                  <p className="text-muted mt-0.5 text-xs">{profile.potencia}</p>
                )}
              </div>
            </div>

            {facts.length > 0 && (
              <dl className="flex flex-col gap-3.5">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex items-start gap-2.5">
                    <span className="bg-accent/15 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <fact.icon size={15} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-muted text-[10px] font-bold uppercase tracking-wide">
                        {fact.label}
                      </dt>
                      <dd className="mt-0.5 text-xs font-semibold leading-snug">{fact.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}

            <p className="bg-background text-muted rounded-xl p-3 text-[11px] leading-relaxed">
              Dados pessoais e contatos obedecem às permissões de visibilidade definidas no
              cadastro.
            </p>
          </CardContent>
        </Card>
      )}

      {sections.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-0.5 p-2">
            {sections.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="hover:bg-background text-foreground flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
              >
                {section.label}
                <span className="text-accent text-xs font-semibold">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
