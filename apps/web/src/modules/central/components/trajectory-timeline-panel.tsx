import type { PublicMemberProfileDTO } from '@vl6/domain';
import { getBoardPositionLabel, MEMBER_SITUATION_REASON_LABELS } from '@vl6/shared';
import { Cross, LogOut, Milestone } from '@vl6/ui';
import { TimelineEntry } from '@/components/membership/institutional-panel';
import { formatCompactDate, Panel } from './profile-shared';

/**
 * "Caminho na Loja"/"Caminho na Ordem" — linha do tempo institucional
 * (Iniciação/Elevação/Exaltação, cargos/comissões, encerramento da
 * trajetória) extraída de `ProfileTrajectoryTab` pra ser reusada também
 * pelo bento do Perfil In Memoriam (`InMemoriamProfileView`) — mesmo dado,
 * mesma peça visual, só o `kicker`/`title` mudam conforme o contexto.
 * `null` quando não há nenhum marco (nunca renderiza um Panel vazio).
 */
export function TrajectoryTimelinePanel({
  profile,
  kicker = 'TRAJETÓRIA',
  title = 'Caminho na Loja',
}: {
  profile: PublicMemberProfileDTO;
  kicker?: string;
  title?: string;
}) {
  const trajetoria = profile.trajetoria;
  const hasTrajetoria = Boolean(
    trajetoria &&
    (trajetoria.dataIniciacao ||
      trajetoria.dataElevacao ||
      trajetoria.dataExaltacao ||
      trajetoria.cargos.length > 0 ||
      trajetoria.comissoes.length > 0 ||
      trajetoria.encerramento),
  );

  if (!hasTrajetoria || !trajetoria) return null;

  const encerramento = trajetoria.encerramento;
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

  return (
    <Panel kicker={kicker} title={title} icon={Milestone}>
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
  );
}
