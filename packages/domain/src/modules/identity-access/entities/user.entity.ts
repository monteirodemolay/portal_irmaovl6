import type { BaseEntity } from '../../../shared/base-entity';

export const USER_ACCOUNT_STATUSES = ['pending', 'active', 'blocked'] as const;
export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];

/**
 * Conta de acesso — `id` é o mesmo `uid` do Firebase Auth (docs/architecture
 * /03-modelo-dados.md). Pode existir sem `memberId` (ex.: Visitante com
 * acesso restrito), mas sempre pertence a exatamente um `Role`.
 */
export interface User extends BaseEntity {
  email: string;
  memberId: string | null;
  roleId: string;
  mfaHabilitado: boolean;
  ultimoLogin: Date | null;
  statusConta: UserAccountStatus;
}
