import type { RoleKey, PermissionKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Um papel é um conjunto nomeado de permissões. Papéis `sistemico = true`
 * (seed de fábrica) não podem ser excluídos nem esvaziados pela UI — ver
 * docs/architecture/06-regras-negocio.md §6.6. Tenants podem criar papéis
 * adicionais com `sistemico = false` e qualquer combinação de permissões.
 */
export interface Role extends BaseEntity {
  nome: string;
  chave: RoleKey | string;
  permissoes: PermissionKey[];
  sistemico: boolean;
}
