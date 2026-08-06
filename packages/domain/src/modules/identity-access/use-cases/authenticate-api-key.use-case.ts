import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { IApiKeyRepository } from '../repositories/api-key.repository';
import type { IApiKeyGenerator } from '../services/api-key-generator';

export interface AuthenticateApiKeyInput {
  plainTextKey: string;
}

export interface AuthenticateApiKeyDeps {
  apiKeyRepository: IApiKeyRepository;
  apiKeyGenerator: IApiKeyGenerator;
  clock: IClock;
}

/** Sentinela em `AuthContext.roleId` para requisições autenticadas por API Key, nunca um usuário humano. */
export const API_KEY_ROLE_ID = 'api-key';

/**
 * Verifica uma API Key recebida em `Authorization: Bearer <key>` — usado
 * pelo wrapper de rotas `/api/v1/**` (apps/web), nunca por uma sessão de
 * usuário. Registra `ultimoUso` a cada chamada bem-sucedida.
 */
export class AuthenticateApiKeyUseCase {
  constructor(private readonly deps: AuthenticateApiKeyDeps) {}

  async execute(input: AuthenticateApiKeyInput): Promise<Result<AuthContext>> {
    const hash = this.deps.apiKeyGenerator.hash(input.plainTextKey);
    const apiKey = await this.deps.apiKeyRepository.findByHash(hash);
    if (!apiKey) {
      return err(new NotFoundError('ApiKey', 'chave'));
    }
    if (apiKey.deletedAt !== null) {
      return err(new ForbiddenError('api-key:revoked'));
    }

    await this.deps.apiKeyRepository.update({
      ...apiKey,
      ultimoUso: this.deps.clock.now(),
    });

    return ok({
      uid: apiKey.id,
      tenantId: apiKey.tenantId,
      roleId: API_KEY_ROLE_ID,
      permissions: apiKey.permissoes,
    });
  }
}
