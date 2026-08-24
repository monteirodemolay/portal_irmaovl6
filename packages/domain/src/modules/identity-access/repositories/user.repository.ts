import type { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(uid: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  listByTenant(tenantId: string): Promise<User[]>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  /**
   * Exclusão física, deliberada — única exceção à regra de soft delete do
   * sistema. Usado só por `DeleteMyAccountUseCase` (LGPD): quando a
   * identidade de acesso é apagada, o documento não tem mais razão de
   * existir (diferente de `Member`, que é registro institucional
   * preservado). Nunca chamado fora desse fluxo.
   */
  delete(uid: string): Promise<void>;
}
