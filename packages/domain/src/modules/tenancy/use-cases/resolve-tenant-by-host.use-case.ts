import { ok, err, NotFoundError, type Result } from '../../../shared/result';
import type { Tenant } from '../entities/tenant.entity';
import type { ITenantRepository } from '../repositories/tenant.repository';

export interface ResolveTenantByHostDeps {
  tenantRepository: ITenantRepository;
}

/**
 * Resolve o tenant a partir do host da requisição — chamado pelo middleware
 * do Next.js antes de qualquer autenticação (docs/architecture/07-fluxo-
 * autenticacao.md §7.1). Tenta domínio customizado primeiro, depois
 * subdomínio (`<subdominio>.portaldoirmao.app`).
 */
export class ResolveTenantByHostUseCase {
  constructor(private readonly deps: ResolveTenantByHostDeps) {}

  async execute(host: string): Promise<Result<Tenant>> {
    const bareHost = host.split(':')[0] ?? host;

    const byDomain = await this.deps.tenantRepository.findByDomain(bareHost);
    if (byDomain && byDomain.deletedAt === null && byDomain.ativo) {
      return ok(byDomain);
    }

    const subdomain = bareHost.split('.')[0];
    if (subdomain) {
      const bySubdomain = await this.deps.tenantRepository.findBySubdomain(subdomain);
      if (bySubdomain && bySubdomain.deletedAt === null && bySubdomain.ativo) {
        return ok(bySubdomain);
      }
    }

    return err(new NotFoundError('Tenant', bareHost));
  }
}
