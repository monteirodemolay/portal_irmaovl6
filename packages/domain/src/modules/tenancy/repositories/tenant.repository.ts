import type { Tenant } from '../entities/tenant.entity';

/**
 * Toda implementação (Firestore em `packages/infra`, in-memory em testes)
 * deve obrigatoriamente filtrar por tenant nos métodos que recebem
 * `tenantId` — nunca existe um método "listar tudo" sem escopo.
 */
export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findByDomain(domain: string): Promise<Tenant | null>;
  findBySubdomain(subdomain: string): Promise<Tenant | null>;
  existsBySubdomain(subdomain: string): Promise<boolean>;
  create(tenant: Tenant): Promise<void>;
  update(tenant: Tenant): Promise<void>;
}
