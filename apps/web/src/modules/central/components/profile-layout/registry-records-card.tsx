import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import { Panel } from '../profile-shared';
import {
  ProfileTrajectoryTab,
  type ParamasonicAffiliationDisplay,
} from '../profile-trajectory-tab';
import { ProfileFamilyTab } from '../profile-family-tab';
import { RegistryPositionsCard } from './registry-positions-card';

/**
 * "Registros maçônicos" — grupo de subcards da coluna central (mock-up
 * "Perfil VL6"): Cargos e funções, Títulos e condições, Honrarias e
 * condecorações, Graus filosóficos, Vínculos honorários/paramaçônicos e
 * Família e Legado. Reorganiza os subcomponentes que já existem
 * (`ProfileTrajectoryTab` sem a linha do tempo — já mostrada sozinha na
 * coluna de linha do tempo —, `ProfileFamilyTab`) numa pilha só, em vez de
 * escrever de novo a lógica de dados/visibilidade de cada um. Some por
 * completo se nenhum subcard tiver conteúdo.
 */
export function RegistryRecordsCard({
  profile,
  canViewAcervo,
  memberTitles,
  honors,
  philosophicalJourneys,
  paramasonicAffiliations,
}: {
  profile: PublicMemberProfileDTO;
  canViewAcervo: boolean;
  memberTitles: MemberTitle[];
  honors: Honor[];
  philosophicalJourneys: PhilosophicalJourney[];
  paramasonicAffiliations: ParamasonicAffiliationDisplay[];
}) {
  const hasFamilia = Boolean(
    profile.familia && Object.values(profile.familia).some((group) => (group?.length ?? 0) > 0),
  );
  const hasPositions = Boolean(
    profile.trajetoria &&
    (profile.trajetoria.cargos.length > 0 || profile.trajetoria.comissoes.length > 0),
  );
  const hasSecondary =
    memberTitles.length > 0 ||
    honors.length > 0 ||
    philosophicalJourneys.some((journey) => journey.visivel) ||
    paramasonicAffiliations.length > 0 ||
    profile.irmaosGemeos.length > 0;

  if (!hasPositions && !hasSecondary && !hasFamilia) return null;

  return (
    <Panel id="registros" kicker="CONSOLIDAÇÃO POR CATEGORIA" title="Registros maçônicos">
      <div className="flex flex-col gap-4">
        <RegistryPositionsCard profile={profile} />
        <ProfileTrajectoryTab
          profile={profile}
          memberTitles={memberTitles}
          honors={honors}
          philosophicalJourneys={philosophicalJourneys}
          paramasonicAffiliations={paramasonicAffiliations}
          showTrajectory={false}
        />
        {hasFamilia && <ProfileFamilyTab profile={profile} canViewAcervo={canViewAcervo} />}
      </div>
    </Panel>
  );
}
