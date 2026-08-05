interface WindowEntry {
  count: number;
  windowStart: number;
}

export interface RateLimitOptions {
  /** Máximo de requisições permitidas dentro da janela. */
  limit: number;
  /** Duração da janela, em milissegundos. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Presente somente quando `allowed` é `false`. */
  retryAfterMs?: number;
}

/**
 * Rate limiter de janela fixa, em memória — docs/architecture/10-roadmap.md
 * v1.3, "Rate limiting da API REST". Estado por processo: correto para o
 * deploy atual (um único processo Node de longa duração), mas não
 * compartilhado entre instâncias caso a aplicação passe a rodar
 * horizontalmente escalada — nesse cenário o limite passaria a ser "por
 * instância", não global, e um store compartilhado (Redis, etc.) seria
 * necessário. Não vale a complexidade/dependência extra antes disso ser
 * um problema real.
 */
export class RateLimiter {
  private readonly windows = new Map<string, WindowEntry>();

  check(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    this.sweepIfNeeded(now, windowMs);

    const entry = this.windows.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return { allowed: true };
    }

    if (entry.count < limit) {
      entry.count += 1;
      return { allowed: true };
    }

    return { allowed: false, retryAfterMs: entry.windowStart + windowMs - now };
  }

  /** Evita crescimento ilimitado do Map quando há muitas chaves distintas (IPs, uids, etc.). */
  private sweepIfNeeded(now: number, windowMs: number): void {
    if (this.windows.size < 10_000) return;
    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart >= windowMs) {
        this.windows.delete(key);
      }
    }
  }
}
