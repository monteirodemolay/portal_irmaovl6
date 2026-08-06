import type { ApiKey } from '../entities/api-key.entity';

export interface IApiKeyRepository {
  findById(id: string): Promise<ApiKey | null>;
  /** Sem filtro de tenantId de propósito — a requisição ainda não sabe de qual tenant é até decodificar a chave. Só `AuthenticateApiKeyUseCase` chama. */
  findByHash(keyHash: string): Promise<ApiKey | null>;
  listByTenant(tenantId: string): Promise<ApiKey[]>;
  create(apiKey: ApiKey): Promise<void>;
  update(apiKey: ApiKey): Promise<void>;
}
