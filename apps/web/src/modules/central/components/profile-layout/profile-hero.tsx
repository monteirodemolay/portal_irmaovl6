import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { MEMBER_SITUATION_STATUS_LABELS } from '@vl6/shared';
import { CalendarDays, Cross, ShieldCheck } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import { formatDate, getCurrentAssignment } from '../profile-shared';

/**
 * Faixa de identificação no topo do Perfil (mock-up "Perfil VL6") — retrato
 * grande, "eyebrow" com o nome da Loja, nome completo (H1), meta (cargo
 * atual + grau + CIM) e o selo de situação. Substitui o antigo
 * `ProfileHeaderCard`/`InMemoriamHero` — mesma peça pros dois casos (Irmão
 * ativo e In Memoriam), só o selo de situação e a legenda mudam.
 */
export function ProfileHero({
  profile,
  isOwnProfile = false,
}: {
  profile: PublicMemberProfileDTO;
  isOwnProfile?: boolean;
}) {
  const current = getCurrentAssignment(profile.trajetoria);
  const dataIniciacao = profile.trajetoria?.dataIniciacao ?? profile.dataIniciacao;
  const isInMemoriam = profile.situacao === 'falecido';
  const canEdit = isOwnProfile && !isInMemoriam;

  return (
    <section className="from-primary to-primary-dark relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-sm">
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle at 85% 15%, white 0%, transparent 38%)',
        }}
      />
      <div className="relative flex flex-col gap-6 p-6 min-[620px]:flex-row min-[620px]:items-center min-[620px]:justify-between sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center min-[620px]:flex-row min-[620px]:items-center min-[620px]:text-left">
          <MemberAvatar
            fotoUrl={profile.fotoUrl}
            nome={profile.nomeCompleto}
            className="border-surface h-24 w-24 shrink-0 rounded-2xl border-4 shadow-md sm:h-28 sm:w-28"
            imgClassName="object-top"
          />
          <div className="min-w-0">
            {profile.loja && (
              <p className="text-accent text-[11px] font-bold uppercase tracking-[0.17em]">
                {profile.loja}
              </p>
            )}
            <h1 className="font-display mt-1.5 text-3xl font-semibold leading-tight sm:text-4xl">
              {profile.nomeCompleto}
            </h1>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm text-white/80 min-[620px]:justify-start">
              {current?.label && <span>{current.label}</span>}
              <span>{MEMBER_DEGREE_LABELS[profile.grau]}</span>
              {profile.cim && <span>CIM {profile.cim}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 min-[620px]:items-end">
          <StatusBadge profile={profile} />
          {canEdit && (
            <Link
              href="/irmaos/meu-espaco"
              className="mt-1 text-xs font-medium text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              Editar meu perfil
            </Link>
          )}
        </div>
      </div>

      {(dataIniciacao || (isInMemoriam && profile.dataFalecimento)) && (
        <div className="relative border-t border-white/10 px-6 py-3 text-center text-xs text-white/60 min-[620px]:text-left sm:px-8">
          {isInMemoriam
            ? profile.dataFalecimento && (
                <span className="flex items-center justify-center gap-1.5 min-[620px]:justify-start">
                  <Cross size={12} strokeWidth={1.75} />
                  Passou ao Oriente Eterno em {formatDate(profile.dataFalecimento)}
                </span>
              )
            : dataIniciacao && (
                <span className="flex items-center justify-center gap-1.5 min-[620px]:justify-start">
                  <CalendarDays size={12} strokeWidth={1.75} />
                  Iniciado em {formatDate(dataIniciacao)}
                </span>
              )}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ profile }: { profile: PublicMemberProfileDTO }) {
  if (profile.situacao === 'falecido') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide">
        <Cross size={13} strokeWidth={2} />
        In Memoriam
      </span>
    );
  }

  if (profile.situacao === 'ativo') {
    return (
      <div className="flex flex-col items-center gap-1 min-[620px]:items-end">
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-100">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
          Ativo e regular
        </span>
        <span className="text-[11px] text-white/55">Situação cadastral atualizada</span>
      </div>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold">
      <ShieldCheck size={13} strokeWidth={1.75} />
      {MEMBER_SITUATION_STATUS_LABELS[profile.situacao]}
    </span>
  );
}
