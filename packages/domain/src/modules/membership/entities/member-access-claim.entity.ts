import type { MemberAccessClaimStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Solicitação de acesso ao Portal via "Reivindicar Cadastro" — fica em
 * `pendente` até um Administrador aprovar ou rejeitar
 * (`ApproveMemberAccessClaimUseCase`/`RejectMemberAccessClaimUseCase`,
 * ambos `member:manage`). Antes da aprovação não existe conta Firebase
 * Auth/`User` nenhuma a partir deste fluxo — diferente do comportamento
 * anterior de `ClaimMemberAccountUseCase`, que liberava o acesso na hora.
 * `ip` só dá contexto de segurança pra quem revisa, nunca é usado pra
 * decidir nada automaticamente.
 */
export interface MemberAccessClaim extends BaseEntity {
  memberId: string;
  emailSolicitado: string;
  ip: string | null;
  revisaoStatus: MemberAccessClaimStatus;
  motivoRejeicao: string | null;
  revisadoPor: string | null;
  revisadoEm: Date | null;
}
