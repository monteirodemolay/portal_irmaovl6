/**
 * Portas de infraestrutura que o domínio depende apenas por interface —
 * implementadas em `packages/infra` (relógio real, IDs do Firestore) e
 * facilmente substituíveis por fakes determinísticos em teste.
 */
export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  next(): string;
}

/**
 * Criptografia reversível de segredos de terceiros (ex.: refresh/access
 * token do Google Calendar) — diferente do hash irreversível de
 * `ApiKey.keyHash`, aqui é preciso LER o valor de volta para renovar o
 * access token.
 */
export interface ITokenCipher {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

export interface OAuthStatePayload {
  uid: string;
  tenantId: string;
  issuedAt: number;
}

/** Assina/valida o parâmetro `state` do handshake OAuth2 sem round-trip ao banco. */
export interface IOAuthStateSigner {
  sign(payload: OAuthStatePayload): string;
  /** `null` quando a assinatura é inválida ou o token está corrompido. */
  verify(token: string): OAuthStatePayload | null;
}
