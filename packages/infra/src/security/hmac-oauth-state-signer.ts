import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  IntegrationNotConfiguredError,
  type IOAuthStateSigner,
  type OAuthStatePayload,
} from '@vl6/domain';

const ALGORITHM = 'sha256';

/**
 * Assina/valida o `state` do handshake OAuth2 do Google sem round-trip ao
 * banco (ver `IOAuthStateSigner`). Reaproveita `GOOGLE_TOKEN_ENCRYPTION_KEY`
 * como segredo — HMAC e AES-GCM são derivações distintas do mesmo segredo
 * "da integração Google", evitando uma quinta env var só pra isso.
 */
export class HmacOAuthStateSigner implements IOAuthStateSigner {
  private getSecret(): string {
    const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    if (!secret) {
      throw new IntegrationNotConfiguredError('Google Calendar');
    }
    return secret;
  }

  sign(payload: OAuthStatePayload): string {
    const secret = this.getSecret();
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac(ALGORITHM, secret).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  verify(token: string): OAuthStatePayload | null {
    const secret = this.getSecret();
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    const expected = createHmac(ALGORITHM, secret).update(body).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
    } catch {
      return null;
    }
  }
}
