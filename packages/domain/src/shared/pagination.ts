export interface PageRequest {
  cursor?: string;
  limit: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export function clampPageLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT);
}
