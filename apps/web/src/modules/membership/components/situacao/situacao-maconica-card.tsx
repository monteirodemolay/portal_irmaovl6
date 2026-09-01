import { MEMBER_SITUATION_REASON_LABELS, TERMINAL_MEMBER_SITUATION_STATUSES } from '@vl6/shared';
import type { Member, MemberSituationRecord } from '@vl6/domain';
import { Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { SituacaoBadge } from './situacao-badge';
import { RegisterSituationDialog } from './register-situation-dialog';
import { SituacaoHistorico } from './situacao-historico';

function reasonLabel(motivo: string): string {
  return (
    MEMBER_SITUATION_REASON_LABELS[motivo as keyof typeof MEMBER_SITUATION_REASON_LABELS] ?? motivo
  );
}

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : '—';
}

/**
 * Seção "Situação Maçônica" da ficha do Irmão (docs pedidos pelo
 * Administrador §6) — selo da situação atual + ações de mudança no topo,
 * "Histórico Maçônico" (linha do tempo) logo abaixo. `vigente`/`historico`
 * já vêm carregados pelo Server Component pai (`MemberEditPanel`).
 */
export function SituacaoMaconicaCard({
  member,
  vigente,
  historico,
}: {
  member: Member;
  vigente: MemberSituationRecord | null;
  historico: MemberSituationRecord[];
}) {
  const situacaoAtualLabel = vigente
    ? `${reasonLabel(vigente.motivo)}, desde ${formatDate(vigente.dataInicio)}`
    : 'sem registro no histórico';

  const podeAlterarPara = TERMINAL_MEMBER_SITUATION_STATUSES.includes(member.situacao)
    ? 'retorno'
    : 'alterar';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Situação Maçônica</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <SituacaoBadge situacao={member.situacao} />
          {vigente && (
            <span className="text-muted text-sm">
              {reasonLabel(vigente.motivo)} · desde {formatDate(vigente.dataInicio)}
              {(vigente.lojaId || vigente.potencia) &&
                ` · ${[vigente.lojaId, vigente.potencia].filter(Boolean).join(' · ')}`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {podeAlterarPara === 'alterar' ? (
            <>
              <RegisterSituationDialog
                memberId={member.id}
                mode="alterar"
                triggerLabel="Alterar situação"
                triggerVariant="primary"
                situacaoAtualLabel={situacaoAtualLabel}
              />
              <RegisterSituationDialog
                memberId={member.id}
                mode="licenca"
                triggerLabel="Registrar licença"
                situacaoAtualLabel={situacaoAtualLabel}
              />
            </>
          ) : (
            <RegisterSituationDialog
              memberId={member.id}
              mode="retorno"
              triggerLabel="Registrar retorno"
              triggerVariant="primary"
              situacaoAtualLabel={situacaoAtualLabel}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Histórico Maçônico</h3>
          <SituacaoHistorico records={historico} />
        </div>
      </CardContent>
    </Card>
  );
}
