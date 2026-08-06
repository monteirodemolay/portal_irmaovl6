import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { ApiKey } from '../entities/api-key.entity';
import type { IApiKeyRepository } from '../repositories/api-key.repository';

export interface RevokeApiKeyInput {
  apiKeyId: string;
}

export interface RevokeApiKeyDeps {
  apiKeyRepository: IApiKeyRepository;
  clock: IClock;
}

export class RevokeApiKeyUseCase {
  constructor(private readonly deps: RevokeApiKeyDeps) {}

  async execute(ctx: AuthContext, input: RevokeApiKeyInput): Promise<Result<ApiKey>> {
    requirePermission(ctx, 'tenant:manage');

    const apiKey = await this.deps.apiKeyRepository.findById(input.apiKeyId);
    if (!apiKey) {
      return err(new NotFoundError('ApiKey', input.apiKeyId));
    }
    if (apiKey.tenantId !== ctx.tenantId) {
      return err(new ForbiddenError('tenant:manage'));
    }

    const now = this.deps.clock.now();
    const revoked: ApiKey = {
      ...apiKey,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.apiKeyRepository.update(revoked);

    return ok(revoked);
  }
}
