import Link from 'next/link';
import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import {
  FRATERNAL_AFFILIATION_LABELS,
  HONOR_TYPE_LABELS,
  MEMBER_TITLE_LABELS,
  type FraternalAffiliationKind,
} from '@vl6/shared';
import { Award, EmptyState, Handshake, Sparkles, Users } from '@vl6/ui';
import { CeremonyMatesPanel } from '@/components/membership/ceremony-mates-panel';
import { HONOR_TYPE_BADGE_ICON, MEMBER_TITLE_BADGE_ICON } from '@/modules/honors/honor-badge-icons';
import { formatDate, Panel } from './profile-shared';
import { HonorDetailDialog } from './honor-detail-dialog';
import { TrajectoryTimelinePanel } from './trajectory-timeline-panel';

/** Um vínculo com ordem paramaçônica (DeMolay etc.) já resolvido pra exibição. */
export interface ParamasonicAffiliationDisplay {
  id: string;
  affiliationKind: FraternalAffiliationKind;
  organizacaoNome: string | null;
  unidadeNome: string | null;
  cargos: string[];
  /** Link pro perfil público da `ParamasonicEntity`, quando existir uma cadastrada com o mesmo nome. */
  entityHref: string | null;
}

/**
 * Aba "Trajetória e Honrarias" do Perfil único (Fase 2/3, mock-up
 * homônimo) — linha do tempo institucional (Iniciação/Elevação/Exaltação +
 * cargos/comissões, já existia como "Caminho na Loja" na coluna lateral)
 * junto dos Títulos e Condições, Honrarias e Condecorações e Graus
 * Filosóficos/Corpos Maçônicos cadastrados (Fase 1/3 do domínio de
 * Honrarias) e de "Irmãos Gêmeos"/Colegas de Cerimônia. Graus filosóficos
 * só entram na lista se `visivel` — dado sensível/sigiloso que exige
 * autorização explícita do Irmão pra divulgação pública.
 *
 * Layout em duas colunas (mesmo espírito 8/4 da Visão Geral): "Caminho na
 * Loja" é o único bloco sequencial/longo, então fica sozinho numa coluna
 * mais larga; Títulos/Honrarias/Graus Filosóficos/Irmãos Gêmeos são todos
 * "contexto secundário" — cartões curtos, tipo selo — e ficam empilhados
 * juntos numa coluna mais estreita ao lado, em vez de cada um ocupar a
 * largura inteira da tela um embaixo do outro (o que deixava um Irmão com
 * pouco conteúdo, ex. um único Título, com um cartão minúsculo esticado
 * numa linha inteira). Colapsa pra uma coluna só quando só um dos dois
 * lados existe — nunca reserva espaço vazio pro lado que não tem conteúdo.
 */
export function ProfileTrajectoryTab({
  profile,
  memberTitles,
  honors,
  philosophicalJourneys,
  paramasonicAffiliations = [],
}: {
  profile: PublicMemberProfileDTO;
  memberTitles: MemberTitle[];
  honors: Honor[];
  philosophicalJourneys: PhilosophicalJourney[];
  paramasonicAffiliations?: ParamasonicAffiliationDisplay[];
}) {
  const visibleJourneys = philosophicalJourneys.filter((journey) => journey.visivel);
  const hasTrajetoria = Boolean(
    profile.trajetoria &&
    (profile.trajetoria.dataIniciacao ||
      profile.trajetoria.dataElevacao ||
      profile.trajetoria.dataExaltacao ||
      profile.trajetoria.cargos.length > 0 ||
      profile.trajetoria.comissoes.length > 0 ||
      profile.trajetoria.encerramento),
  );

  const hasSecondary =
    memberTitles.length > 0 ||
    honors.length > 0 ||
    visibleJourneys.length > 0 ||
    profile.irmaosGemeos.length > 0 ||
    paramasonicAffiliations.length > 0;

  const trajetoriaPanel = hasTrajetoria ? <TrajectoryTimelinePanel profile={profile} /> : null;

  const titlesPanel = memberTitles.length > 0 && (
    <Panel kicker="TÍTULOS" title="Títulos e Condições Maçônicas" icon={Users} compact>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {memberTitles.map((title) => (
          <li
            key={title.id}
            className="border-border bg-background flex flex-col items-center gap-2 rounded-xl border p-3 text-center"
          >
            <img
              src={MEMBER_TITLE_BADGE_ICON[title.titulo]}
              alt=""
              className="h-14 w-14 shrink-0 object-contain"
            />
            <span className="text-xs font-medium leading-tight">
              {title.titulo === 'outro' ? title.tituloOutro : MEMBER_TITLE_LABELS[title.titulo]}
            </span>
            {title.dataConcessao && (
              <span className="text-muted text-[11px]">{formatDate(title.dataConcessao)}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );

  const honorsPanel = honors.length > 0 && (
    <Panel
      kicker="HONRARIAS"
      title="Honrarias e Condecorações"
      icon={Award}
      compact
      trailing={
        <Link
          href="/irmaos/galeria-de-honra"
          className="text-accent shrink-0 text-xs font-semibold hover:underline"
        >
          Ver Galeria
        </Link>
      }
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {honors.map((honor) => (
          <li
            key={honor.id}
            className="border-border bg-background flex flex-col items-center gap-2 rounded-xl border p-3 text-center"
          >
            <img
              src={HONOR_TYPE_BADGE_ICON[honor.tipo]}
              alt=""
              className="h-14 w-14 shrink-0 object-contain"
            />
            <span className="line-clamp-2 text-xs font-medium leading-tight">
              {honor.nomeOficial}
            </span>
            <span className="text-muted text-[11px]">
              {HONOR_TYPE_LABELS[honor.tipo]}
              {honor.data ? ` · ${formatDate(honor.data)}` : ''}
            </span>
            <HonorDetailDialog honor={honor} />
          </li>
        ))}
      </ul>
    </Panel>
  );

  const journeysPanel = visibleJourneys.length > 0 && (
    <Panel
      kicker="GRAUS FILOSÓFICOS"
      title="Graus Filosóficos e Corpos Maçônicos"
      icon={Sparkles}
      compact
    >
      <ul className="flex flex-wrap gap-2">
        {visibleJourneys.map((journey) => (
          <li
            key={journey.id}
            className="border-border bg-background flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
          >
            <span className="font-medium">
              {journey.rito}
              {journey.grau ? ` · ${journey.grau}` : ''}
            </span>
            {journey.data && <span className="text-muted text-xs">{formatDate(journey.data)}</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );

  const ceremonyPanel = profile.irmaosGemeos.length > 0 && (
    <CeremonyMatesPanel groups={profile.irmaosGemeos} compact />
  );

  const paramasonicPanel = paramasonicAffiliations.length > 0 && (
    <Panel kicker="ORGANIZAÇÕES IRMÃS" title="Vínculos Paramaçônicos" icon={Handshake} compact>
      <ul className="flex flex-col gap-2">
        {paramasonicAffiliations.map((affiliation) => {
          const conteudo = (
            <>
              <span className="flex items-center gap-1.5">
                <span className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                  {FRATERNAL_AFFILIATION_LABELS[affiliation.affiliationKind]}
                </span>
              </span>
              <span className="block font-medium">
                {affiliation.organizacaoNome ?? affiliation.unidadeNome}
              </span>
              {affiliation.cargos.length > 0 && (
                <span className="text-muted block text-xs">{affiliation.cargos.join(' · ')}</span>
              )}
            </>
          );
          return (
            <li
              key={affiliation.id}
              className="border-border bg-background rounded-xl border p-3 text-sm"
            >
              {affiliation.entityHref ? (
                <Link href={affiliation.entityHref} className="hover:underline">
                  {conteudo}
                </Link>
              ) : (
                conteudo
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );

  return (
    <div
      className={
        trajetoriaPanel && hasSecondary
          ? 'grid grid-cols-1 gap-6 md:grid-cols-12'
          : 'flex flex-col gap-6'
      }
    >
      {trajetoriaPanel ? (
        hasSecondary ? (
          <div className="md:col-span-7">{trajetoriaPanel}</div>
        ) : (
          trajetoriaPanel
        )
      ) : (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum cargo institucional registrado"
          description="Este Irmão ainda não tem cargos de Diretoria ou comissões registrados no histórico."
        />
      )}

      {hasSecondary && (
        <div
          className={trajetoriaPanel ? 'flex flex-col gap-6 md:col-span-5' : 'flex flex-col gap-6'}
        >
          {titlesPanel}
          {honorsPanel}
          {journeysPanel}
          {paramasonicPanel}
          {ceremonyPanel}
        </div>
      )}
    </div>
  );
}
