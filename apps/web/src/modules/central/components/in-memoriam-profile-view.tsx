import type { ReactNode } from 'react';
import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import { EmptyState, Users } from '@vl6/ui';
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
import { type ParamasonicAffiliationDisplay } from './profile-trajectory-tab';
import { ProfileAcervoTab } from './profile-acervo-tab';

/**
 * Perfil "In Memoriam" — mesma estrutura de 3 colunas do Perfil ativo
 * (`PublicMemberProfileView`/`ProfileShell`), pedido explícito do
 * Administrador no mock-up "Perfil VL6": "o MESMO layout deve valer pros
 * dois casos... só mudando quais dados aparecem em cada situação". Antes
 * usava uma grade "bento" de 12 colunas própria — substituída por esta
 * (Fase de unificação de layout). O que muda em relação ao Irmão ativo:
 * - o selo de situação vira "In Memoriam" (`ProfileHero` já trata isso
 *   sozinho a partir de `profile.situacao`);
 * - "Apresentação" prioriza a mensagem de homenagem
 *   (`profile.mensagemHomenagem`), com a biografia como complemento;
 * - "Dados cadastrais" ganha a Passagem ao Oriente Eterno;
 * - a coluna de linha do tempo continua mostrando toda a trajetória
 *   histórica, já com o marco de falecimento (`TrajectoryTimelinePanel`);
 * - "Irmãos Gêmeos" e "Memória Fotográfica"/Acervo continuam existindo,
 *   só reorganizados dentro da mesma grade de "Registros maçônicos"/Acervo.
 *
 * Reusa os mesmos dados e sub-componentes do Perfil ativo — nenhuma regra
 * de negócio/visibilidade é duplicada, só a disposição espacial.
 */
export function InMemoriamProfileView({
  profile,
  canViewAcervo = false,
  memberTitles = [],
  honors = [],
  philosophicalJourneys = [],
  paramasonicAffiliations = [],
  acervoPhotos = [],
  acervoRelationsSlot = null,
  layout = 'full',
}: {
  profile: PublicMemberProfileDTO;
  canViewAcervo?: boolean;
  memberTitles?: MemberTitle[];
  honors?: Honor[];
  philosophicalJourneys?: PhilosophicalJourney[];
  paramasonicAffiliations?: ParamasonicAffiliationDisplay[];
  acervoPhotos?: PersonPhoto[];
  acervoRelationsSlot?: ReactNode;
  layout?: 'full' | 'compact';
}) {
  const hasApresentacao = Boolean(profile.mensagemHomenagem || profile.apresentacao?.texto);
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
  const hasCeremonyMates = profile.irmaosGemeos.length > 0;
  // Mesmo recorte de `PublicMemberProfileView` — o que sobra em
  // `RegistrationDataCard` depois que Nome completo/Situação saíram (já na
  // `ProfileHero`): Passagem ao Oriente Eterno (praticamente sempre presente
  // aqui, mas `dataFalecimento` tecnicamente pode faltar), Cônjuge e Filhos.
  const hasDadosCadastrais = Boolean(
    profile.dataFalecimento ||
    profile.conjuge?.nome ||
    (profile.conjuge?.diaNascimento && profile.conjuge?.mesNascimento) ||
    profile.filhos.length > 0,
  );

  const sections: ProfileSectionLink[] = [
    hasApresentacao ? { id: 'apresentacao', label: 'Apresentação' } : null,
    hasDadosCadastrais ? { id: 'dados', label: 'Dados cadastrais' } : null,
    hasRegistros ? { id: 'registros', label: 'Registros maçônicos' } : null,
    hasCeremonyMates ? { id: 'irmaos-gemeos', label: 'Irmãos Gêmeos' } : null,
    canViewAcervo ? { id: 'acervo', label: 'Acervo' } : null,
  ].filter((section): section is ProfileSectionLink => section !== null);

  return (
    <div className="flex flex-col gap-6">
      <ProfileHero profile={profile} />

      <ProfileShell
        layout={layout}
        identity={<ProfileIdentityRail profile={profile} sections={sections} />}
        main={
          <>
            <ProfileStatsStrip profile={profile} memberTitles={memberTitles} honors={honors} />
            <PresentationCard profile={profile} />
            <RegistrationDataCard profile={profile} />
            <RegistryRecordsCard
              profile={profile}
              canViewAcervo={canViewAcervo}
              memberTitles={memberTitles}
              honors={honors}
              philosophicalJourneys={philosophicalJourneys}
              paramasonicAffiliations={paramasonicAffiliations}
            />

            {!hasRegistros && (
              <EmptyState
                icon={<Users size={22} />}
                title="Nenhum registro institucional"
                description="Este Irmão ainda não tem trajetória, cargos ou vínculos registrados no histórico."
              />
            )}

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
        timeline={
          <TrajectoryTimelinePanel
            profile={profile}
            kicker="VIDA MAÇÔNICA"
            title="Caminho na Ordem"
          />
        }
      />
    </div>
  );
}
