import type { AuthContext } from '../../../shared/auth-context';
import { requirePlatformAdmin } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { Tenant } from '../entities/tenant.entity';
import type { ITenantRepository } from '../repositories/tenant.repository';

export interface SetTenantActiveInput {
  tenantId: string;
  ativo: boolean;
}

export interface SetTenantActiveDeps {
  tenantRepository: ITenantRepository;
  clock: IClock;
}

/**
 * Ativa/suspende uma Loja — painel do Administrador Geral (billing/plano
 * em atraso, suporte, etc.). `Tenant.ativo = false` já é respeitado por
 * `ResolveTenantByHostUseCase` (para de resolver a Loja por domínio/
 * subdomínio), então suspender aqui já tira o site do ar sem precisar de
 * lógica adicional em nenhum outro lugar.
 */
export class SetTenantActiveUseCase {
  constructor(private readonly deps: SetTenantActiveDeps) {}

  async execute(ctx: AuthContext, input: SetTenantActiveInput): Promise<Result<Tenant>> {
    requirePlatformAdmin(ctx);

    const tenant = await this.deps.tenantRepository.findById(input.tenantId);
    if (!tenant) {
      return err(new NotFoundError('Tenant', input.tenantId));
    }

    const updated: Tenant = {
      ...tenant,
      ativo: input.ativo,
      status: input.ativo ? 'active' : 'inactive',
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.tenantRepository.update(updated);

    return ok(updated);
  }
}
