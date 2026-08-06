import type { Tenant } from '../entities/tenant.entity';

/**
 * Toda implementação (Firestore em `packages/infra`, in-memory em testes)
 * deve obrigatoriamente filtrar por tenant nos métodos que recebem
 * `tenantId` — nunca existe um método "listar tudo" sem escopo, com uma
 * única exceção deliberada: `listAll`, usado exclusivamente pelo painel do
 * Administrador Geral (`ListAllTenantsUseCase`, `requirePlatformAdmin` —
 * docs/architecture/08 §8.3). Nenhum outro caso de uso deve chamá-lo.
 */
export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findByDomain(domain: string): Promise<Tenant | null>;
  findBySubdomain(subdomain: string): Promise<Tenant | null>;
  existsBySubdomain(subdomain: string): Promise<boolean>;
  listAll(): Promise<Tenant[]>;
  create(tenant: Tenant): Promise<void>;
  update(tenant: Tenant): Promise<void>;
}
