import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, err, ok, type Result } from '../../../shared/result';
import type { TenantDomainVerification } from '../entities/tenant-domain-verification.entity';
import type { ITenantDomainVerificationRepository } from '../repositories/tenant-domain-verification.repository';

export interface RequestDomainVerificationInput {
  domain: string;
}

export interface RequestDomainVerificationDeps {
  domainVerificationRepository: ITenantDomainVerificationRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Primeiro passo do domínio customizado por tenant (docs/architecture/10
 * v2.0): gera um token e devolve a instrução de registro TXT
 * (`_vl6-verify.<dominio>`) que o Administrador da Loja precisa publicar
 * no DNS antes de `VerifyDomainUseCase` ativar o domínio de verdade.
 * Reemitir uma solicitação para o mesmo domínio (ex.: token expirado)
 * gera um token novo, sem problema — só o resultado de `VerifyDomainUseCase`
 * é que ativa `Tenant.dominio`.
 */
export class RequestDomainVerificationUseCase {
  constructor(private readonly deps: RequestDomainVerificationDeps) {}

  async execute(
    ctx: AuthContext,
    input: RequestDomainVerificationInput,
  ): Promise<Result<TenantDomainVerification>> {
    requirePermission(ctx, 'tenant:manage');

    const domain = input.domain.toLowerCase().trim();
    const existing = await this.deps.domainVerificationRepository.findByDomain(domain);
    if (existing && existing.verified && existing.tenantId !== ctx.tenantId) {
      return err(new ConflictError(`O domínio "${domain}" já está em uso por outra Loja.`));
    }

    const now = this.deps.clock.now();
    const entry: TenantDomainVerification = {
      id: domain,
      tenantId: ctx.tenantId,
      token: this.deps.idGenerator.next(),
      verified: false,
      createdAt: existing?.tenantId === ctx.tenantId ? existing.createdAt : now,
      verifiedAt: null,
    };

    if (existing) {
      await this.deps.domainVerificationRepository.update(entry);
    } else {
      await this.deps.domainVerificationRepository.create(entry);
    }

    return ok(entry);
  }
}
