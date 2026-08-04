export const ENTITY_STATUSES = ['active', 'inactive', 'archived', 'draft'] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];
