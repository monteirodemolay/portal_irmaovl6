import type { MemberTitle, PublicMemberProfileDTO } from '@vl6/domain';
import { getBoardPositionLabel, MEMBER_TITLE_LABELS } from '@vl6/shared';
import { EmptyState, Milestone, Users } from '@vl6/ui';
import { TimelineEntry } from '@/components/membership/institutional-panel';
import { CeremonyMatesPanel } from '@/components/membership/ceremony-mates-panel';
import { formatDate, Panel } from './profile-shared';

/**
 * Aba "Trajetória e Honrarias" do Perfil único (Fase 2/3, mock-up
 * homônimo) — linha do tempo institucional (Iniciação/Elevação/Exaltação +
 * cargos/comissões, já existia como "Caminho na Loja" na coluna lateral)
 * junto dos Títulos e Condições cadastrados (Fase 1 do domínio de
 * Honrarias) e de "Irmãos Gêmeos"/Colegas de Cerimônia. Honrarias e
 * Condecorações e Graus Filosóficos entram numa fase seguinte, quando o
 * domínio dessas duas entidades existir.
 */
export function ProfileTrajectoryTab({
  profile,
  memberTitles,
}: {
  profile: PublicMemberProfileDTO;
  memberTitles: MemberTitle[];
}) {
  const hasTrajetoria = Boolean(
    profile.trajetoria &&
    (profile.trajetoria.dataIniciacao ||
      profile.trajetoria.dataElevacao ||
      profile.trajetoria.dataExaltacao ||
      profile.trajetoria.cargos.length > 0 ||
      profile.trajetoria.comissoes.length > 0),
  );

  return (
    <div className="flex flex-col gap-6">
      {hasTrajetoria && profile.trajetoria ? (
        <Panel kicker="TRAJETÓRIA" title="Caminho na Loja" icon={Milestone}>
          <div className="flex flex-col gap-4">
            {profile.trajetoria.dataIniciacao && (
              <TimelineEntry
                label="Iniciação"
                dateLabel={formatDate(profile.trajetoria.dataIniciacao)}
                active
                href={
                  profile.trajetoria.ceremonyEventIds.iniciacao
                    ? `/acervo/eventos/${profile.trajetoria.ceremonyEventIds.iniciacao}`
                    : undefined
                }
              />
            )}
            {profile.trajetoria.dataElevacao && (
              <TimelineEntry
                label="Elevação"
                dateLabel={formatDate(profile.trajetoria.dataElevacao)}
                active
                href={
                  profile.trajetoria.ceremonyEventIds.elevacao
                    ? `/acervo/eventos/${profile.trajetoria.ceremonyEventIds.elevacao}`
                    : undefined
                }
              />
            )}
            {profile.trajetoria.dataExaltacao && (
              <TimelineEntry
                label="Exaltação"
                dateLabel={formatDate(profile.trajetoria.dataExaltacao)}
                active
                href={
                  profile.trajetoria.ceremonyEventIds.exaltacao
                    ? `/acervo/eventos/${profile.trajetoria.ceremonyEventIds.exaltacao}`
                    : undefined
                }
              />
            )}
            {profile.trajetoria.cargos.map((entry, index) => (
              <TimelineEntry
                key={`cargo-${index}`}
                label={getBoardPositionLabel(entry.cargo)}
                dateLabel={formatDate(entry.dataInicio)}
                active={!entry.dataFim}
                current={!entry.dataFim}
                detail={`Cargo · ${entry.gestaoNome}${entry.dataFim ? ` até ${formatDate(entry.dataFim)}` : ' · em curso'}`}
                href={`/acervo/gestoes/${entry.gestaoId}`}
              />
            ))}
            {profile.trajetoria.comissoes.map((entry, index) => (
              <TimelineEntry
                key={`comissao-${index}`}
                label={entry.nome}
                dateLabel={formatDate(entry.dataInicio)}
                active={!entry.dataFim}
                current={!entry.dataFim}
                detail={`Comissão · ${entry.gestaoNome}${entry.dataFim ? ` até ${formatDate(entry.dataFim)}` : ' · em curso'}`}
                href={`/acervo/gestoes/${entry.gestaoId}`}
              />
            ))}
          </div>
        </Panel>
      ) : (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum cargo institucional registrado"
          description="Este Irmão ainda não tem cargos de Diretoria ou comissões registrados no histórico."
        />
      )}

      {memberTitles.length > 0 && (
        <Panel kicker="TÍTULOS" title="Títulos e Condições Maçônicas" icon={Users}>
          <ul className="flex flex-wrap gap-2">
            {memberTitles.map((title) => (
              <li
                key={title.id}
                className="border-border bg-background flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              >
                <span className="font-medium">
                  {title.titulo === 'outro' ? title.tituloOutro : MEMBER_TITLE_LABELS[title.titulo]}
                </span>
                {title.dataConcessao && (
                  <span className="text-muted text-xs">{formatDate(title.dataConcessao)}</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <CeremonyMatesPanel groups={profile.irmaosGemeos} />
    </div>
  );
}
