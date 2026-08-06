import { createHash, randomBytes } from 'node:crypto';
import type { GeneratedApiKey, IApiKeyGenerator } from '@vl6/domain';

const PREFIX = 'vl6_live_';

/** Gera e faz hash de API Keys via `node:crypto` — sha256, sem sal (é uma chave de alta entropia, não uma senha). */
export class NodeApiKeyGenerator implements IApiKeyGenerator {
  generate(): GeneratedApiKey {
    const secret = randomBytes(24).toString('base64url');
    const plainText = `${PREFIX}${secret}`;
    return { plainText, prefix: plainText.slice(0, PREFIX.length + 6), hash: this.hash(plainText) };
  }

  hash(plainText: string): string {
    return createHash('sha256').update(plainText).digest('hex');
  }
}
