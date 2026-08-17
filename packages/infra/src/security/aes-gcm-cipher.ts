import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { IntegrationNotConfiguredError, type ITokenCipher } from '@vl6/domain';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Criptografia reversível de tokens OAuth do Google (ver `ITokenCipher`).
 * A chave é lida de `GOOGLE_TOKEN_ENCRYPTION_KEY` em cada operação (não no
 * construtor) — assim `createServerContainer()` continua funcionando
 * normalmente em ambientes sem a integração Google configurada; só quem
 * efetivamente tenta cifrar/decifrar um token recebe o erro claro.
 */
export class AesGcmCipher implements ITokenCipher {
  private getKey(): Buffer {
    const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    if (!secret) {
      throw new IntegrationNotConfiguredError('Google Calendar');
    }
    // `scryptSync` deriva uma chave de 32 bytes determinística a partir do
    // segredo bruto — funciona com qualquer tamanho de string de entrada,
    // sem exigir que o operador gere um segredo de exatamente 32 bytes.
    return scryptSync(secret, 'vl6-google-token-cipher', 32);
  }

  encrypt(plainText: string): string {
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(cipherText: string): string {
    const key = this.getKey();
    const buffer = Buffer.from(cipherText, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
