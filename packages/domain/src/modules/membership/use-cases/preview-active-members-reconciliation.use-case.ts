import { normalizeNameForSearch, type MemberSituationStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IUserRepository } from '../../identity-access/repositories/user.repository';
import { ACTIVE_MEMBERS_RECONCILIATION_LIST } from '../lib/active-members-reconciliation-list';

export type ActiveMembersReconciliationAction =
  | 'manter_ativo'
  | 'confirmar_manualmente'
  | 'desligar_e_bloquear'
  | 'so_bloquear_acesso'
  | 'sem_alteracao_falecido';

export interface ActiveMembersReconciliationRow {
  memberId: string;
  nomeCompleto: string;
  cim: string | null;
  situacaoAtual: MemberSituationStatus;
  temAcessoAtivo: boolean;
  naLista: boolean;
  acao: ActiveMembersReconciliationAction;
}

export interface ActiveMembersReconciliationPreview {
  linhas: ActiveMembersReconciliationRow[];
  nomesNaoEncontrados: string[];
}

export interface PreviewActiveMembersReconciliationDeps {
  memberRepository: IMemberRepository;
  userRepository: IUserRepository;
}

/**
 * Decide a ação de cada Irmão pra reconciliação de cadastro ativo (ver
 * `ACTIVE_MEMBERS_RECONCILIATION_LIST`) — função pura, compartilhada entre
 * a prévia (`PreviewActiveMembersReconciliationUseCase`) e a aplicação
 * (`ApplyActiveMembersReconciliationUseCase`), pra nunca divergir entre o
 * que o Administrador vê e o que é executado.
 *
 * - Na lista + já `ativo`: nada a fazer.
 * - Na lista + outra situação: nunca muda sozinho — o Administrador decide
 *   (pode ser um erro de digitação no nome, pode ser um retorno real).
 * - Fora da lista + `falecido`: nunca mexe (In Memoriam é definitivo).
 * - Fora da lista + `ativo`: vira `desligado` (motivo "Outro", a ajustar
 *   depois pelo Administrador) e tem o acesso ao Portal bloqueado.
 * - Fora da lista + qualquer outra situação (licenciado/suspenso/
 *   desligado): "fica com o status que já tem" — só o acesso ao Portal é
 *   bloqueado.
 */
export function decideActiveMembersReconciliationAction(
  situacaoAtual: MemberSituationStatus,
  naLista: boolean,
): ActiveMembersReconciliationAction {
  if (naLista) {
    return situacaoAtual === 'ativo' ? 'manter_ativo' : 'confirmar_manualmente';
  }
  if (situacaoAtual === 'falecido') return 'sem_alteracao_falecido';
  return situacaoAtual === 'ativo' ? 'desligar_e_bloquear' : 'so_bloquear_acesso';
}

/**
 * Monta a prévia da reconciliação (Fase única, sob pedido direto do
 * Administrador) — nunca escreve nada, só lê `Member`/`User` e decide a
 * ação de cada um contra `ACTIVE_MEMBERS_RECONCILIATION_LIST`. A tela
 * `/admin/pessoas/irmaos/reconciliar-ativos` mostra este resultado antes
 * de liberar o botão "Aplicar" (`ApplyActiveMembersReconciliationUseCase`).
 */
export class PreviewActiveMembersReconciliationUseCase {
  constructor(private readonly deps: PreviewActiveMembersReconciliationDeps) {}

  async execute(ctx: AuthContext): Promise<ActiveMembersReconciliationPreview> {
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
    const matchedNames = new Set<string>();

    const linhas: ActiveMembersReconciliationRow[] = members.map((member) => {
      const normalizedName = normalizeNameForSearch(member.nomeCompleto);
      const naLista = targetNames.has(normalizedName);
      if (naLista) matchedNames.add(normalizedName);

      return {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        cim: member.cim,
        situacaoAtual: member.situacao,
        temAcessoAtivo: activeUserByMemberId.has(member.id),
        naLista,
        acao: decideActiveMembersReconciliationAction(member.situacao, naLista),
      };
    });

    const nomesNaoEncontrados = ACTIVE_MEMBERS_RECONCILIATION_LIST.filter(
      (nome) => !matchedNames.has(normalizeNameForSearch(nome)),
    );

    linhas.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));

    return { linhas, nomesNaoEncontrados };
  }
}
