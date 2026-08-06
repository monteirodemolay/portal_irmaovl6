import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ApiKey } from '../entities/api-key.entity';
import type { IApiKeyRepository } from '../repositories/api-key.repository';

export interface ListApiKeysDeps {
  apiKeyRepository: IApiKeyRepository;
}

export class ListApiKeysUseCase {
  constructor(private readonly deps: ListApiKeysDeps) {}

  async execute(ctx: AuthContext): Promise<ApiKey[]> {
    requirePermission(ctx, 'tenant:manage');
    return this.deps.apiKeyRepository.listByTenant(ctx.tenantId);
  }
}
