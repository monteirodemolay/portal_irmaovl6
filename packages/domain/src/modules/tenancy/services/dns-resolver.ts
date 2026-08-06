/**
 * Resolução de registros DNS TXT — usada para provar posse de um domínio
 * customizado antes de ativá-lo (`RequestDomainVerificationUseCase`,
 * `VerifyDomainUseCase`). Implementação real em `packages/infra` (módulo
 * `dns` do Node); nenhum SDK específico de provedor.
 */
export interface IDnsResolver {
  resolveTxt(hostname: string): Promise<string[]>;
}
