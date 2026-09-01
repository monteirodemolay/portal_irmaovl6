import { MEMBER_SITUATION_REASON_LABELS } from '@vl6/shared';
import type { MemberSituationRecord } from '@vl6/domain';
import { Download, FileText } from '@vl6/ui';
import { SituacaoBadge } from './situacao-badge';
import { EditSituationRecordDialog } from './edit-situation-record-dialog';

function reasonLabel(motivo: string): string {
  return (
    MEMBER_SITUATION_REASON_LABELS[motivo as keyof typeof MEMBER_SITUATION_REASON_LABELS] ?? motivo
  );
}

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : '—';
}

function formatPeriodo(record: MemberSituationRecord): string {
  const inicio = formatDate(record.dataInicio);
  return record.dataFim ? `De ${inicio} a ${formatDate(record.dataFim)}` : `Desde ${inicio}`;
}

/**
 * "Histórico Maçônico" — linha do tempo do mais recente pro mais antigo
 * (docs pedidos pelo Administrador §7). `records` já vem carregado pelo
 * Server Component pai; aqui é só apresentação + a ação de corrigir.
 */
export function SituacaoHistorico({ records }: { records: MemberSituationRecord[] }) {
  const ordenados = [...records].sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime());

  if (ordenados.length === 0) {
    return <p className="text-muted text-sm">Nenhum registro de Situação Maçônica ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {ordenados.map((record) => (
        <li key={record.id} className="border-border flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SituacaoBadge situacao={record.situacao} />
              <span className="text-sm font-medium">{reasonLabel(record.motivo)}</span>
              {record.motivo === 'outro' && record.motivoOutroDescricao && (
                <span className="text-muted text-sm">— {record.motivoOutroDescricao}</span>
              )}
            </div>
            <EditSituationRecordDialog record={record} />
          </div>

          <p className="text-muted text-sm">
            {formatPeriodo(record)}
            {record.dataInicioEstimada && ' (data estimada — pendente de revisão)'}
          </p>

          {(record.lojaId || record.potencia) && (
            <p className="text-muted text-sm">
              {[record.lojaId, record.potencia].filter(Boolean).join(' · ')}
            </p>
          )}

          {record.documentoNumero && (
            <p className="text-muted text-sm">
              Documento nº {record.documentoNumero}
              {record.documentoData && ` — ${formatDate(record.documentoData)}`}
            </p>
          )}

          {record.observacoes && <p className="text-sm">{record.observacoes}</p>}

          {record.justificativaEdicaoRetroativa && (
            <p className="text-muted text-xs italic">
              Correção: {record.justificativaEdicaoRetroativa}
            </p>
          )}

          {record.anexos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {record.anexos.map((anexo) => (
                <a
                  key={anexo.url}
                  href={anexo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border text-accent inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:underline"
                >
                  <FileText size={12} />
                  {anexo.nome}
                  <Download size={12} />
                </a>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
