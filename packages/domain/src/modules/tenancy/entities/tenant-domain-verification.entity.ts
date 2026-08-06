/**
 * Prova de posse de um domínio customizado antes de ativá-lo em
 * `Tenant.dominio` — docs/architecture/10-roadmap.md v2.0. `id` é o
 * próprio domínio normalizado (minúsculo, sem porta), único globalmente:
 * um domínio só pode estar em processo de verificação/verificado por um
 * tenant por vez. Sem `BaseEntity`: é um registro de processo, não uma
 * entidade de negócio com soft delete (mesmo raciocínio de `AuditLog`).
 */
export interface TenantDomainVerification {
  id: string;
  tenantId: string;
  token: string;
  verified: boolean;
  createdAt: Date;
  verifiedAt: Date | null;
}
