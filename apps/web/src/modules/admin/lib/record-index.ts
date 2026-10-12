/**
 * Índice de títulos em memória para a busca da Administração.
 *
 * Não há índice de texto no Firestore: percorremos as páginas do tenant uma
 * vez e guardamos só o necessário por um curto período, para que digitar não
 * dispare leituras repetidas. É um cache por instância do servidor, portanto
 * "melhor esforço": instância nova refaz a leitura.
 */

export interface PageLike<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

/** Lê páginas até acabar ou atingir `cap`; informa se cortou. */
export async function loadPagesUpTo<T>(
  load: (cursor?: string) => Promise<PageLike<T>>,
  cap: number,
  pageSize = 100,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let pages = 0; pages <= Math.ceil(cap / pageSize) + 1; pages++) {
    const page = await load(cursor);
    items.push(...page.items);
    if (items.length >= cap)
      return { items: items.slice(0, cap), truncated: page.hasMore || items.length > cap };
    if (!page.hasMore) return { items, truncated: false };
    if (!page.nextCursor || seen.has(page.nextCursor)) return { items, truncated: true };
    cursor = page.nextCursor;
    seen.add(cursor);
  }
  return { items, truncated: true };
}

export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now) {
  const store = new Map<string, { at: number; value: T }>();
  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && now() - hit.at < ttlMs) return hit.value;
      const value = await load();
      store.set(key, { at: now(), value });
      return value;
    },
    clear: () => store.clear(),
  };
}
