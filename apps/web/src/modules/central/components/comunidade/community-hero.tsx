import type { Tenant } from '@vl6/domain';
import { CommunityHeroPhotoUpload } from './community-hero-photo-upload';

// Nenhum campo de domínio guarda o nome do Templo físico da Loja (procurado
// em todo o repositório — "Templo"/"Ivan Damasceno" só aparecem em nomes de
// teste e módulos sem relação). Até que a Loja cadastre isso em algum lugar
// do domínio, mantém-se como texto fixo, igual ao mock-up.
const TEMPLE_NAME = 'Templo Ivan Damasceno';

/**
 * Hero da Comunidade VL6 — maior novidade em relação ao mock-up (docs de
 * referência da tarefa): foto de fundo real, configurável pelo Administrador
 * da Loja (`tenant:manage`), persistida em `Tenant.comunidadeHeroFotoUrl`.
 * Sem foto cadastrada, cai no mesmo gradiente já usado em `ProfileHero`
 * (`from-primary to-primary-dark`), mantendo a identidade visual do site.
 */
export function CommunityHero({
  tenant,
  canManagePhoto,
}: {
  tenant: Tenant;
  canManagePhoto: boolean;
}) {
  const fotoUrl = tenant.comunidadeHeroFotoUrl;
  const posicao = tenant.comunidadeHeroFotoPosicao ?? 50;

  return (
    <section className="from-primary to-primary-dark relative isolate overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-sm">
      {fotoUrl && (
        <>
          <img
            src={fotoUrl}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            style={{ objectPosition: `center ${posicao}%` }}
          />
          <div className="from-primary-dark/95 via-primary-dark/80 to-primary-dark/40 absolute inset-0 -z-10 bg-gradient-to-r" />
        </>
      )}

      <div className="relative flex max-w-xl flex-col gap-3 p-7 sm:p-9">
        <span className="text-accent text-[11px] font-bold uppercase tracking-[0.19em]">
          {tenant.nome}
        </span>
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Irmãos</h1>
        <p className="max-w-md text-sm text-white/85">
          Pessoas, trajetórias e conhecimentos que fortalecem nossa comunidade. Encontre um Irmão ou
          conheça seus negócios e serviços.
        </p>
        <p className="text-accent/90 text-xs">{TEMPLE_NAME}</p>

        {canManagePhoto && (
          <CommunityHeroPhotoUpload hasPhoto={Boolean(fotoUrl)} initialPosicao={posicao} />
        )}
      </div>
    </section>
  );
}
