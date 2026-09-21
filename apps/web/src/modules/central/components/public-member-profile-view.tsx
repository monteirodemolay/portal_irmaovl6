import type { ReactNode } from 'react';
import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import type { PersonPhoto } from '@/modules/archive/components/person-photo-grid';
import { ProfileShell } from './profile-layout/profile-shell';
import { ProfileHero } from './profile-layout/profile-hero';
import {
  ProfileIdentityRail,
  type ProfileSectionLink,
} from './profile-layout/profile-identity-rail';
import { ProfileStatsStrip } from './profile-layout/profile-stats-strip';
import { PresentationCard } from './profile-layout/presentation-card';
import { RegistrationDataCard } from './profile-layout/registration-data-card';
import { RegistryRecordsCard } from './profile-layout/registry-records-card';
import { TrajectoryTimelinePanel } from './trajectory-timeline-panel';
import { ProfileOverviewTab } from './profile-overview-tab';
import { type ParamasonicAffiliationDisplay } from './profile-trajectory-tab';
import { ProfileAcervoTab } from './profile-acervo-tab';
import { InMemoriamProfileView } from './in-memoriam-profile-view';

/**
 * Perfil único do Irmão — layout de 3 colunas (identidade fixa à esquerda,
 * conteúdo documental em cards no centro, linha do tempo à direita), mesma
 * estrutura pedida pelo Administrador no mock-up "Perfil VL6"
 * (`/tmp/claude-0/mockup/perfil-vl6`). Antes empilhava seções (Visão Geral /
 * Trajetória e Honrarias / Família e Legado / Acervo) em largura cheia —
 * agora tudo mora nas 3 colunas de `ProfileShell`, reorganizando os mesmos
 * subcomponentes de sempre (`ProfileOverviewTab`, `ProfileTrajectoryTab`,
 * `ProfileFamilyTab`, `ProfileAcervoTab`, `TrajectoryTimelinePanel`) — nenhum
 * dado ou regra de visibilidade foi reescrito, só a disposição espacial.
 * Nunca renderiza uma seção vazia: se uma delas não tem nada pra mostrar,
 * ela mesma decide o que exibir no lugar (ver cada `Profile*Tab`/card).
 */
export function PublicMemberProfileView({
  profile,
  canViewAcervo = false,
  isOwnProfile = false,
  memberTitles = [],
  honors = [],
  philosophicalJourneys = [],
  paramasonicAffiliations = [],
  acervoPhotos = [],
  acervoRelationsSlot = null,
  layout = 'full',
}: {
  profile: PublicMemberProfileDTO;
  /** Gate da seção "Acervo" — ponte Diretório → Acervo (Fase B/C). */
  canViewAcervo?: boolean;
  /** Sessão atual == dono deste perfil → mostra "Editar meu perfil" e "Editar" por bloco. */
  isOwnProfile?: boolean;
  /** Títulos e Condições Maçônicas cadastrados (Fase 1 de Honrarias) — exibidos em Registros maçônicos. */
  memberTitles?: MemberTitle[];
  /** Honrarias e Condecorações cadastradas (Fase 3 de Honrarias) — exibidas em Registros maçônicos. */
  honors?: Honor[];
  /** Graus Filosóficos/Corpos Maçônicos (Fase 3) — só os `visivel` chegam à UI. */
  philosophicalJourneys?: PhilosophicalJourney[];
  /** Vínculos com ordens paramaçônicas (DeMolay etc.) — exibidos em Registros maçônicos, com link pro perfil da entidade quando existir. */
  paramasonicAffiliations?: ParamasonicAffiliationDisplay[];
  /** Fotos institucionais do Acervo VL6 em que este Irmão está marcado — ver `ProfileAcervoTab`. */
  acervoPhotos?: PersonPhoto[];
  /** `RelationsSection` (Server Component, precisa de `container`/`authContext`) já renderizado pela página. */
  acervoRelationsSlot?: ReactNode;
  /**
   * `'full'` (padrão) — página cheia (`/irmaos/[memberId]`). `'compact'` —
   * "Ver como os outros veem" (Dialog, sempre mais estreito que a página
   * cheia) — força 1 coluna, sem depender de nenhum breakpoint de viewport
   * (`ProfileShell` já trata isso).
   */
  layout?: 'full' | 'compact';
}) {
  // Perfil In Memoriam (situação terminal `falecido`) usa a mesma estrutura
  // de 3 colunas, só trocando o conteúdo — ver `InMemoriamProfileView`.
  if (profile.situacao === 'falecido') {
    return (
      <InMemoriamProfileView
        profile={profile}
        canViewAcervo={canViewAcervo}
        memberTitles={memberTitles}
        honors={honors}
        philosophicalJourneys={philosophicalJourneys}
        paramasonicAffiliations={paramasonicAffiliations}
        acervoPhotos={acervoPhotos}
        acervoRelationsSlot={acervoRelationsSlot}
        layout={layout}
      />
    );
  }

  const hasApresentacao = Boolean(profile.apresentacao?.texto);
  // Cidade/profissão/área/formação não entram aqui — já aparecem em
  // "Perfil em resumo", dentro da coluna de identidade (`ProfileIdentityRail`).
  const hasVivenciaContato = Boolean(
    profile.informacoesMaconicas?.lojasVisitadas ||
    profile.informacoesMaconicas?.interessesMaconicos ||
    (profile.afiliacoes && profile.afiliacoes.length > 0) ||
    (profile.contatos && Object.values(profile.contatos).some(Boolean)) ||
    (profile.redes && Object.values(profile.redes).some(Boolean)) ||
    profile.endereco,
  );
  const hasRegistros = Boolean(
    (profile.trajetoria &&
      (profile.trajetoria.cargos.length > 0 || profile.trajetoria.comissoes.length > 0)) ||
    memberTitles.length > 0 ||
    honors.length > 0 ||
    philosophicalJourneys.some((journey) => journey.visivel) ||
    paramasonicAffiliations.length > 0 ||
    profile.irmaosGemeos.length > 0 ||
    (profile.familia && Object.values(profile.familia).some((group) => (group?.length ?? 0) > 0)),
  );
  // Único conteúdo que sobrou em `RegistrationDataCard` depois que Nome
  // completo/Situação maçônica saíram (já na `ProfileHero`, acima) — aqui
  // só situação In Memoriam (nunca vale `true` nesta função, que já
  // redireciona `falecido` pra `InMemoriamProfileView`) e Cônjuge.
  const hasDadosCadastrais = Boolean(
    profile.informacoesPessoais?.conjuge?.nome ||
    (profile.informacoesPessoais?.conjuge?.diaNascimento &&
      profile.informacoesPessoais?.conjuge?.mesNascimento),
  );

  const sections: ProfileSectionLink[] = [
    hasApresentacao ? { id: 'apresentacao', label: 'Apresentação' } : null,
    hasDadosCadastrais ? { id: 'dados', label: 'Dados cadastrais' } : null,
    hasVivenciaContato ? { id: 'visao-geral', label: 'Vivência e contato' } : null,
    hasRegistros ? { id: 'registros', label: 'Registros maçônicos' } : null,
    canViewAcervo ? { id: 'acervo', label: 'Acervo' } : null,
  ].filter((section): section is ProfileSectionLink => section !== null);

  return (
    <div className="flex flex-col gap-6">
      <ProfileHero profile={profile} isOwnProfile={isOwnProfile} />

      <ProfileShell
        layout={layout}
        identity={<ProfileIdentityRail profile={profile} sections={sections} />}
        main={
          <>
            <ProfileStatsStrip profile={profile} memberTitles={memberTitles} honors={honors} />
            <PresentationCard profile={profile} isOwnProfile={isOwnProfile} />
            <RegistrationDataCard profile={profile} />
            {hasVivenciaContato && (
              <div id="visao-geral" className="scroll-mt-24">
                <ProfileOverviewTab
                  profile={profile}
                  isOwnProfile={isOwnProfile}
                  layout="compact"
                  hideBio
                />
              </div>
            )}
            <RegistryRecordsCard
              profile={profile}
              canViewAcervo={canViewAcervo}
              memberTitles={memberTitles}
              honors={honors}
              philosophicalJourneys={philosophicalJourneys}
              paramasonicAffiliations={paramasonicAffiliations}
            />
            {canViewAcervo && (
              <div id="acervo" className="scroll-mt-24">
                <ProfileAcervoTab
                  profile={profile}
                  canViewAcervo={canViewAcervo}
                  acervoPhotos={acervoPhotos}
                  relationsSlot={acervoRelationsSlot}
                />
              </div>
            )}
          </>
        }
        timeline={<TrajectoryTimelinePanel profile={profile} />}
      />
    </div>
  );
}
