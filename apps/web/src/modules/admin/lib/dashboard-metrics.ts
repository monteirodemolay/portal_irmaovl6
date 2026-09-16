/** Texto relativo em pt-BR pra timestamps recentes (trilha de auditoria). */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

/** Percentual inteiro de `value` sobre `total` — `0` quando `total` é 0 (nunca divide por zero). */
export function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
