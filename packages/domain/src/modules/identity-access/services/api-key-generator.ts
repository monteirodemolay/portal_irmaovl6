/**
 * Gera o segredo de uma API Key e o hash persistido — implementação real
 * em `packages/infra` (`node:crypto`, sha256). `plainText` só existe aqui,
 * devolvido ao chamador uma única vez; nunca persistido.
 */
export interface GeneratedApiKey {
  plainText: string;
  prefix: string;
  hash: string;
}

export interface IApiKeyGenerator {
  generate(): GeneratedApiKey;
  hash(plainText: string): string;
}
