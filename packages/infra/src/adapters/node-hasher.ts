import { createHash } from 'node:crypto';
import type { IHasher } from '@vl6/domain';

export class NodeHasher implements IHasher {
  sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
