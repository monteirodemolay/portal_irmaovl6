import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { TenantDomainVerification } from '../entities/tenant-domain-verification.entity';
import type { ITenantDomainVerificationRepository } from '../repositories/tenant-domain-verification.repository';
import type { IDnsResolver } from '../services/dns-resolver';
import type { ITenantRepository } from '../repositories/tenant.repository';

export interface VerifyDomainInput {
  domain: string;
}

export interface VerifyDomainDeps {
  domainVerificationRepository: ITenantDomainVerificationRepository;
  tenantRepository: ITenantRepository;
  dnsResolver: IDnsResolver;
  clock: IClock;
}

/**
 * Confirma a posse do domínio via registro TXT (`RequestDomainVerificationUseCase`
 * gerou o token) e, se encontrado, ativa `Tenant.dominio` de verdade —
 * único ponto que escreve esse campo fora do onboarding (docs/architecture
 * /10 v2.0). Idempotente/sem erro quando o TXT ainda não propagou: volta
 * `verified: false` no registro, não é uma falha — o Administrador
 * simplesmente tenta de novo depois.
 */
export class VerifyDomainUseCase {
  constructor(private readonly deps: VerifyDomainDeps) {}

  async execute(
    ctx: AuthContext,
    input: VerifyDomainInput,
  ): Promise<Result<TenantDomainVerification>> {
    requirePermission(ctx, 'tenant:manage');

    const domain = input.domain.toLowerCase().trim();
    const entry = await this.deps.domainVerificationRepository.findByDomain(domain);
    if (!entry) {
      return err(new NotFoundError('TenantDomainVerification', domain));
    }
    if (entry.tenantId !== ctx.tenantId) {
      return err(new ForbiddenError('tenant:manage'));
    }
    if (entry.verified) {
      return ok(entry);
    }

    const records = await this.deps.dnsResolver.resolveTxt(`_vl6-verify.${domain}`);
    if (!records.includes(entry.token)) {
      return ok(entry);
    }

    const now = this.deps.clock.now();
    const verified: TenantDomainVerification = { ...entry, verified: true, verifiedAt: now };
    await this.deps.domainVerificationRepository.update(verified);

    const tenant = await this.deps.tenantRepository.findById(ctx.tenantId);
    if (tenant) {
      await this.deps.tenantRepository.update({
        ...tenant,
        dominio: domain,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    return ok(verified);
  }
}
