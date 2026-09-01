import type { AuditLog, PublicationConsent } from '@vl6/domain';
import { Badge, History } from '@vl6/ui';
import { CollapsibleSection } from '@/components/forms/collapsible-section';

const ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro institucional criado',
  update: 'Cadastro institucional atualizado',
  delete: 'Excluído',
  restore: 'Restaurado',
  member_profile_assisted_started: 'Perfil assistido iniciado pela Administração',
  member_profile_assisted_updated: 'Perfil assistido atualizado pela Administração',
  member_profile_consent_recorded: 'Consentimento registrado',
  member_profile_blocks_published: 'Blocos publicados',
  member_profile_consent_revoked: 'Consentimento revogado',
};

const SOURCE_LABELS: Record<PublicationConsent['source'], string> = {
  self_service: 'Autoatendimento',
  assisted_admin: 'Cadastro assistido',
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

/**
 * Seção 8 — "Histórico de alterações". Combina o log de auditoria (já
 * gravado automaticamente por `withAudit`/`RecordAuditEntryUseCase`, ver
 * `container.ts`) com o histórico de consentimento — nunca reconstrói nada,
 * só lista o que já existe, ordenado do mais recente pro mais antigo.
 */
export function HistoryPanel({
  auditEntries,
  consentHistory,
}: {
  auditEntries: AuditLog[];
  consentHistory: PublicationConsent[];
}) {
  const events = [
    ...auditEntries.map((entry) => ({
      date: entry.timestamp,
      label: ACTION_LABELS[entry.acao] ?? entry.acao,
      detail: `por ${entry.usuarioId}`,
    })),
    ...consentHistory.map((consent) => ({
      date: consent.acceptedAt,
      label: consent.action === 'grant' ? 'Consentimento concedido' : 'Consentimento revogado',
      detail: `${SOURCE_LABELS[consent.source]} · por ${consent.recordedBy}${
        consent.confirmationChannel ? ` · ${consent.confirmationChannel}` : ''
      }`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <CollapsibleSection
      icon={History}
      title="Histórico de alterações"
      description="Auditoria completa deste cadastro e do consentimento de publicação."
      summary={`${events.length} eventos`}
    >
      {events.length === 0 ? (
        <p className="text-muted text-sm">Nenhum evento registrado ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.map((event, index) => (
            <li
              key={index}
              className="border-border flex items-start justify-between gap-3 border-b pb-2 text-sm last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{event.label}</span>
                <span className="text-muted text-xs">{event.detail}</span>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {formatDateTime(event.date)}
              </Badge>
            </li>
          ))}
        </ol>
      )}
    </CollapsibleSection>
  );
}
