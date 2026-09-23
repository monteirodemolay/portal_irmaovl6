import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Badge, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import type { LegalDocumentAcceptance } from '@vl6/domain';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(
    new Date(date),
  );
}

/**
 * Histórico completo de aceites de um Irmão — todas as versões que ele já
 * aceitou, de ambos os documentos, com data/hora, hash de integridade,
 * IP/User-Agent (quando reais) e a origem do registro (aceite genuíno vs.
 * migração administrativa de conta pré-existente — ver
 * docs/legal/04-sistema-de-versionamento.md §8).
 */
export default async function LegalAcceptanceHistoryPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await requirePagePermission('legalDocument:manage');
  const container = createServerContainer();

  const [user, member, historyResult] = await Promise.all([
    container.repositories.user.findById(userId),
    container.repositories.member.findByUserId(session.authContext.tenantId, userId),
    container.useCases.listLegalAcceptanceHistoryForUser.execute(session.authContext, userId),
  ]);

  if (!user || user.tenantId !== session.authContext.tenantId) {
    notFound();
  }

  const history = historyResult.ok ? historyResult.value : [];

  const columns: DataTableColumn<LegalDocumentAcceptance>[] = [
    {
      key: 'documento',
      header: 'Documento',
      cell: (a) => LEGAL_DOCUMENT_TITLES[a.documento],
    },
    { key: 'versao', header: 'Versão', cell: (a) => `v${a.versaoAceita}` },
    { key: 'quando', header: 'Aceito em', cell: (a) => formatDate(a.aceitoEm) },
    {
      key: 'origem',
      header: 'Origem',
      cell: (a) =>
        a.origem === 'migracao_pre_existente' ? (
          <Badge variant="outline">Migração (conta pré-existente)</Badge>
        ) : (
          <Badge variant="success">Aceite direto</Badge>
        ),
    },
    { key: 'ip', header: 'IP', cell: (a) => a.ip ?? '—' },
    {
      key: 'ua',
      header: 'Dispositivo',
      cell: (a) => (
        <span className="block max-w-[220px] truncate text-xs" title={a.userAgent ?? undefined}>
          {a.userAgent ?? '—'}
        </span>
      ),
    },
    {
      key: 'hash',
      header: 'Hash da versão',
      cell: (a) => (
        <span className="font-mono text-xs" title={a.hashVersao}>
          {a.hashVersao.slice(0, 12)}…
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/configuracoes/termos-e-privacidade"
          className="text-accent text-xs font-medium hover:underline"
        >
          ← Voltar à lista
        </Link>
        <h1 className="font-display mt-2 text-2xl font-semibold">
          {member?.nomeCompleto ?? user.email}
        </h1>
        <p className="text-muted text-sm">{user.email}</p>
      </div>

      <DataTable
        columns={columns}
        rows={history}
        getRowId={(a) => a.id}
        emptyState={<EmptyState title="Nenhum aceite registrado para este Irmão" />}
      />
    </div>
  );
}
