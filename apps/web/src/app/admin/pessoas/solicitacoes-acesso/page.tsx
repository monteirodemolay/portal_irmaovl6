import { createServerContainer } from '@vl6/infra';
import type { MemberAccessClaim } from '@vl6/domain';
import { DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ModerateAccessClaimButtons } from '@/modules/membership/components/moderate-access-claim-buttons';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

interface ClaimRow {
  claim: MemberAccessClaim;
  memberLabel: string;
  memberWhatsapp: string | null;
}

/**
 * Fila de revisão do "Reivindicar Cadastro" (docs/architecture) — o
 * Administrador só aprova ou rejeita aqui; a conta Firebase Auth/`User` só
 * nasce na aprovação (`approveMemberAccessClaimAction`). Mesmo padrão de
 * `/admin/acervo/contribuicoes`: fila `pendente`, sem paginação (o volume
 * esperado é baixo — não é um fluxo de alto tráfego).
 */
export default async function MemberAccessClaimsAdminPage() {
  const session = await requirePagePermission('member:manage');

  const container = createServerContainer();
  const claims = await container.useCases.listPendingMemberAccessClaims.execute(
    session.authContext,
  );

  const rows: ClaimRow[] = await Promise.all(
    claims.map(async (claim) => {
      const member = await container.repositories.member.findById(claim.memberId);
      return {
        claim,
        memberLabel: member?.nomeCompleto ?? '(Irmão removido)',
        memberWhatsapp: member?.whatsapp ?? null,
      };
    }),
  );

  const columns: DataTableColumn<ClaimRow>[] = [
    {
      key: 'irmao',
      header: 'Irmão',
      cell: (r) => <span className="font-medium">{r.memberLabel}</span>,
    },
    { key: 'email', header: 'E-mail solicitado', cell: (r) => r.claim.emailSolicitado },
    { key: 'ip', header: 'IP', cell: (r) => r.claim.ip ?? '—' },
    { key: 'data', header: 'Solicitado em', cell: (r) => formatDateTime(r.claim.createdAt) },
    {
      key: 'acoes',
      header: '',
      cell: (r) => (
        <ModerateAccessClaimButtons claimId={r.claim.id} memberWhatsapp={r.memberWhatsapp} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Solicitações de Acesso</h1>
        <p className="text-muted text-sm">
          Pedidos de acesso ao Portal enviados pelo fluxo público &quot;Reivindicar Cadastro&quot;.
          Aprovar cria a conta do Irmão e envia o link pra ele definir a própria senha.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.claim.id}
        emptyState={<EmptyState title="Nenhuma solicitação de acesso pendente" />}
      />
    </div>
  );
}
