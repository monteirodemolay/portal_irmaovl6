import { createServerContainer } from '@vl6/infra';
import type { ArchiveContribution } from '@vl6/domain';
import { ARCHIVE_CONTRIBUTION_STATUS_LABELS, ARCHIVE_CONTRIBUTION_TYPE_LABELS } from '@vl6/shared';
import { Badge, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ModerateContributionButtons } from '@/modules/archive/components/moderate-contribution-buttons';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

interface ContributionRow {
  contribution: ArchiveContribution;
  memberLabel: string;
}

export default async function ArchiveContributionsAdminPage() {
  const session = await requirePagePermission('archiveContribution:manage');

  const container = createServerContainer();
  const contributions = await container.useCases.listArchiveContributions.execute(
    session.authContext,
  );

  const rows: ContributionRow[] = await Promise.all(
    contributions.map(async (contribution) => {
      const member = await container.repositories.member.findById(contribution.memberId);
      return { contribution, memberLabel: member?.nomeCompleto ?? '(Irmão removido)' };
    }),
  );

  const columns: DataTableColumn<ContributionRow>[] = [
    {
      key: 'titulo',
      header: 'Contribuição',
      cell: (r) => (
        <div>
          <span className="text-accent block text-[10px] font-semibold uppercase tracking-wider">
            {ARCHIVE_CONTRIBUTION_TYPE_LABELS[r.contribution.tipo]}
          </span>
          <span className="font-medium">{r.contribution.titulo}</span>
          {r.contribution.arquivoUrl && (
            <>
              {' · '}
              <a
                href={r.contribution.arquivoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Ver arquivo
              </a>
            </>
          )}
        </div>
      ),
    },
    { key: 'membro', header: 'Enviado por', cell: (r) => r.memberLabel },
    { key: 'data', header: 'Data', cell: (r) => formatDate(r.contribution.createdAt) },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <Badge
          variant={
            r.contribution.moderacaoStatus === 'aprovada'
              ? 'success'
              : r.contribution.moderacaoStatus === 'rejeitada'
                ? 'destructive'
                : 'warning'
          }
        >
          {ARCHIVE_CONTRIBUTION_STATUS_LABELS[r.contribution.moderacaoStatus]}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (r) =>
        r.contribution.moderacaoStatus === 'pendente' ? (
          <ModerateContributionButtons contributionId={r.contribution.id} />
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Contribuições dos Irmãos</h1>
        <p className="text-muted text-sm">
          Documentos, fotos e relatos enviados pelos Irmãos, aguardando (ou já em) análise. Aprovar
          não cria automaticamente um item do Acervo — incorpore pelos cadastros de
          Documentos/Fotografias quando fizer sentido.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.contribution.id}
        emptyState={<EmptyState title="Nenhuma contribuição enviada ainda" />}
      />
    </div>
  );
}
