import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IUserRepository } from '../../identity-access/repositories/user.repository';
import type { RegisterMemberSituationUseCase } from './register-member-situation.use-case';
import type { SetUserStatusUseCase } from '../../identity-access/use-cases/set-user-status.use-case';
import { ACTIVE_MEMBERS_RECONCILIATION_LIST } from '../lib/active-members-reconciliation-list';
import { decideActiveMembersReconciliationAction } from './preview-active-members-reconciliation.use-case';

export interface ActiveMembersReconciliationResultRow {
  memberId: string;
  nomeCompleto: string;
  situacaoAlterada: boolean;
  acessoBloqueado: boolean;
}

export interface ApplyActiveMembersReconciliationDeps {
  memberRepository: IMemberRepository;
  userRepository: IUserRepository;
  registerMemberSituation: RegisterMemberSituationUseCase;
  setUserStatus: SetUserStatusUseCase;
  clock: IClock;
}

const RECONCILIATION_MOTIVO_DESCRICAO =
  'Reconciliação de cadastro (2026-09-14) — Irmão fora da lista de ativos informada pelo Administrador. Situação real (licença, desligamento, falecimento etc.) a confirmar individualmente.';

/**
 * Aplica a reconciliação já mostrada em
 * `PreviewActiveMembersReconciliationUseCase` — mesma decisão por Irmão
 * (`decideActiveMembersReconciliationAction`), agora executando de
 * verdade: `RegisterMemberSituationUseCase` (quando a situação muda pra
 * `desligado`) e `SetUserStatusUseCase` (bloqueia o acesso de quem tiver
 * conta vinculada). Nunca mexe em quem está na lista de ativos nem em
 * quem já está `falecido` — ver as regras completas no `Preview`.
 */
export class ApplyActiveMembersReconciliationUseCase {
  constructor(private readonly deps: ApplyActiveMembersReconciliationDeps) {}

  async execute(ctx: AuthContext): Promise<ActiveMembersReconciliationResultRow[]> {
    requirePermission(ctx, 'member:manage');

    const { items: members } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 2000 },
    );
    const users = await this.deps.userRepository.listByTenant(ctx.tenantId);
    const activeUserByMemberId = new Map(
      users
        .filter((user) => user.memberId && user.statusConta !== 'blocked')
        .map((user) => [user.memberId as string, user]),
    );
    const targetNames = new Set(
      ACTIVE_MEMBERS_RECONCILIATION_LIST.map((nome) => normalizeNameForSearch(nome)),
    );

    const results: ActiveMembersReconciliationResultRow[] = [];
    const now = this.deps.clock.now();

    for (const member of members) {
      const naLista = targetNames.has(normalizeNameForSearch(member.nomeCompleto));
      const acao = decideActiveMembersReconciliationAction(member.situacao, naLista);
      if (
        acao === 'manter_ativo' ||
        acao === 'confirmar_manualmente' ||
        acao === 'sem_alteracao_falecido'
      ) {
        continue;
      }

      let situacaoAlterada = false;
      if (acao === 'desligar_e_bloquear') {
        const result = await this.deps.registerMemberSituation.execute(ctx, member.id, {
          situacao: 'desligado',
          motivo: 'outro',
          motivoOutroDescricao: RECONCILIATION_MOTIVO_DESCRICAO,
          dataInicio: now,
        });
        situacaoAlterada = result.ok;
      }

      let acessoBloqueado = false;
      const activeUser = activeUserByMemberId.get(member.id);
      if (activeUser) {
        const result = await this.deps.setUserStatus.execute(ctx, {
          userId: activeUser.id,
          statusConta: 'blocked',
        });
        acessoBloqueado = result.ok;
      }

      if (situacaoAlterada || acessoBloqueado) {
        results.push({
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          situacaoAlterada,
          acessoBloqueado,
        });
      }
    }

    return results;
  }
}
