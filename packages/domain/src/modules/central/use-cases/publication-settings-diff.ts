/** Chaves `true` em `next` que eram `false`/ausentes em `previous` — usado pra saber o que precisa de novo consentimento. */
export function keysTurnedOn<T extends Record<string, boolean>>(previous: T, next: T): (keyof T)[] {
  return (Object.keys(next) as (keyof T)[]).filter((key) => next[key] && !previous[key]);
}

/** Inverso — chaves que eram `true` e viraram `false` (revogação). */
export function keysTurnedOff<T extends Record<string, boolean>>(
  previous: T,
  next: T,
): (keyof T)[] {
  return (Object.keys(next) as (keyof T)[]).filter((key) => !next[key] && previous[key]);
}

export function someTrue(record: Record<string, boolean>): boolean {
  return Object.values(record).some(Boolean);
}
