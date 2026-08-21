import type { PageRequest, PageResult } from '@vl6/domain';

/**
 * Paginação simples por offset (cursor = índice em string) sobre uma lista
 * já carregada em memória — usada pelas abas "Concluídos" (Conteúdo), que
 * mesclam dois critérios (concluído naturalmente + excluído) que o
 * Firestore não filtra numa única query sem índices compostos extras.
 * Volume esperado por Loja é pequeno o bastante pra isso ser aceitável.
 */
export function paginateInMemory<T>(items: T[], page: PageRequest): PageResult<T> {
  const offset = page.cursor ? Number(page.cursor) : 0;
  const slice = items.slice(offset, offset + page.limit);
  const hasMore = items.length > offset + page.limit;
  return {
    items: slice,
    nextCursor: hasMore ? String(offset + page.limit) : null,
    hasMore,
  };
}
