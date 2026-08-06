import { isPermissionKey, type PermissionKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ValidationError, err, ok, type Result } from '../../../shared/result';
import type { ApiKey } from '../entities/api-key.entity';
import type { IApiKeyRepository } from '../repositories/api-key.repository';
import type { IApiKeyGenerator } from '../services/api-key-generator';

export interface CreateApiKeyInput {
  nome: string;
  permissoes: PermissionKey[];
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  plainTextKey: string;
}

export interface CreateApiKeyDeps {
  apiKeyRepository: IApiKeyRepository;
  apiKeyGenerator: IApiKeyGenerator;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Emite uma nova API Key para integração de terceiros — docs/architecture
 * /10 v2.0. `permissoes` nunca pode exceder o que o próprio emissor tem
 * (uma chave não é um jeito de escalar privilégio); `plainTextKey` só
 * existe no retorno deste caso de uso, nunca mais recuperável depois.
 */
export class CreateApiKeyUseCase {
  constructor(private readonly deps: CreateApiKeyDeps) {}

  async execute(ctx: AuthContext, input: CreateApiKeyInput): Promise<Result<CreateApiKeyResult>> {
    requirePermission(ctx, 'tenant:manage');

    if (input.permissoes.length === 0 || !input.permissoes.every(isPermissionKey)) {
      return err(new ValidationError('Selecione ao menos uma permissão válida.'));
    }
    const excedeu = input.permissoes.some((p) => !ctx.permissions.includes(p));
    if (excedeu) {
      return err(new ValidationError('A chave não pode ter mais permissões do que você tem.'));
    }

    const generated = this.deps.apiKeyGenerator.generate();
    const now = this.deps.clock.now();
    const apiKey: ApiKey = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      nome: input.nome,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
      permissoes: input.permissoes,
      ultimoUso: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.apiKeyRepository.create(apiKey);

    return ok({ apiKey, plainTextKey: generated.plainText });
  }
}
