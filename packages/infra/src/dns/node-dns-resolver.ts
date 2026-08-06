import { resolveTxt } from 'node:dns/promises';
import type { IDnsResolver } from '@vl6/domain';

/** Resolve registros TXT via `node:dns` — sem SDK de provedor de DNS específico. */
export class NodeDnsResolver implements IDnsResolver {
  async resolveTxt(hostname: string): Promise<string[]> {
    try {
      const records = await resolveTxt(hostname);
      return records.map((chunks) => chunks.join(''));
    } catch {
      // ENOTFOUND/ENODATA — domínio ainda não tem o TXT record propagado,
      // não é uma falha da nossa infra: VerifyDomainUseCase trata como
      // "ainda não verificado", não como erro.
      return [];
    }
  }
}
