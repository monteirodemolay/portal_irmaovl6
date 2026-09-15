import Link from 'next/link';
import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import {
  getBoardPositionLabel,
  HONOR_TYPE_LABELS,
  MEMBER_SITUATION_REASON_LABELS,
  MEMBER_TITLE_LABELS,
} from '@vl6/shared';
import { Award, Cross, EmptyState, LogOut, Milestone, Sparkles, Users } from '@vl6/ui';
import { TimelineEntry } from '@/components/membership/institutional-panel';
import { CeremonyMatesPanel } from '@/components/membership/ceremony-mates-panel';
import { HONOR_TYPE_BADGE_ICON, MEMBER_TITLE_BADGE_ICON } from '@/modules/honors/honor-badge-icons';
import { formatCompactDate, formatDate, Panel } from './profile-shared';
import { HonorDetailDialog } from './honor-detail-dialog';

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
}: {
  profile: PublicMemberProfileDTO;
  memberTitles: MemberTitle[];
  honors: Honor[];
  philosophicalJourneys: PhilosophicalJourney[];
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

  const trajetoria = profile.trajetoria;
  const encerramento = trajetoria?.encerramento ?? null;
  const isFalecimento = encerramento?.situacao === 'falecido';
  const encerramentoMotivoLabel =
    encerramento && encerramento.motivo !== 'outro'
      ? (MEMBER_SITUATION_REASON_LABELS[
          encerramento.motivo as keyof typeof MEMBER_SITUATION_REASON_LABELS
        ] ?? null)
      : null;
  const encerramentoDetail = isFalecimento
    ? 'Passou ao Oriente Eterno'
    : (encerramento?.motivoOutroDescricao ?? encerramentoMotivoLabel ?? 'Motivo não especificado');

  const hasSecondary =
    memberTitles.length > 0 ||
    honors.length > 0 ||
    visibleJourneys.length > 0 ||
    profile.irmaosGemeos.length > 0;

  const trajetoriaPanel =
    hasTrajetoria && trajetoria ? (
      <Panel kicker="TRAJETÓRIA" title="Caminho na Loja" icon={Milestone}>
        <div className="flex flex-col gap-4">
          {trajetoria.dataIniciacao && (
            <TimelineEntry
              label="Iniciação"
              dateLabel={formatCompactDate(trajetoria.dataIniciacao)}
              active
              href={
                trajetoria.ceremonyEventIds.iniciacao
                  ? `/acervo/eventos/${trajetoria.ceremonyEventIds.iniciacao}`
                  : undefined
              }
            />
          )}
          {trajetoria.dataElevacao && (
            <TimelineEntry
              label="Elevação"
              dateLabel={formatCompactDate(trajetoria.dataElevacao)}
              active
              href={
                trajetoria.ceremonyEventIds.elevacao
                  ? `/acervo/eventos/${trajetoria.ceremonyEventIds.elevacao}`
                  : undefined
              }
            />
          )}
          {trajetoria.dataExaltacao && (
            <TimelineEntry
              label="Exaltação"
              dateLabel={formatCompactDate(trajetoria.dataExaltacao)}
              active
              href={
                trajetoria.ceremonyEventIds.exaltacao
                  ? `/acervo/eventos/${trajetoria.ceremonyEventIds.exaltacao}`
                  : undefined
              }
            />
          )}
          {trajetoria.cargos.map((entry, index) => (
            <TimelineEntry
              key={`cargo-${index}`}
              label={getBoardPositionLabel(entry.cargo)}
              dateLabel={formatCompactDate(entry.dataInicio)}
              active={!entry.dataFim}
              current={!entry.dataFim}
              detail={`Cargo · ${entry.gestaoNome}${entry.dataFim ? ` até ${formatCompactDate(entry.dataFim)}` : ' · em curso'}`}
              href={`/acervo/gestoes/${entry.gestaoId}`}
            />
          ))}
          {trajetoria.comissoes.map((entry, index) => (
            <TimelineEntry
              key={`comissao-${index}`}
              label={entry.nome}
              dateLabel={formatCompactDate(entry.dataInicio)}
              active={!entry.dataFim}
              current={!entry.dataFim}
              detail={`Comissão · ${entry.gestaoNome}${entry.dataFim ? ` até ${formatCompactDate(entry.dataFim)}` : ' · em curso'}`}
              href={`/acervo/gestoes/${entry.gestaoId}`}
            />
          ))}
          {encerramento && (
            <TimelineEntry
              label={isFalecimento ? 'Falecimento' : 'Desligamento'}
              detail={encerramentoDetail}
              dateLabel={formatCompactDate(encerramento.dataInicio)}
              icon={isFalecimento ? Cross : LogOut}
              tone={isFalecimento ? 'memoriam' : 'encerramento'}
            />
          )}
        </div>
      </Panel>
    ) : null;

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
          {ceremonyPanel}
        </div>
      )}
    </div>
  );
}
