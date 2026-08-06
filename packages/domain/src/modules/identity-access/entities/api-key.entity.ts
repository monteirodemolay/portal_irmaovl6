import type { PermissionKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Credencial de longa duração para integrações de terceiros com a API
 * REST pública (`/api/v1/**`, docs/architecture/07 §7.5) — alternativa ao
 * cookie de sessão (web) e ao par access/refresh token (app), pensada
 * para autenticação servidor-a-servidor sem usuário humano por trás.
 * Revogar é soft delete (`deletedAt`), igual a toda outra entidade.
 * `keyHash` (sha256) é o único valor persistido — a chave em texto puro
 * só existe no momento da criação, devolvida uma única vez.
 */
export interface ApiKey extends BaseEntity {
  nome: string;
  keyPrefix: string;
  keyHash: string;
  permissoes: PermissionKey[];
  ultimoUso: Date | null;
}
