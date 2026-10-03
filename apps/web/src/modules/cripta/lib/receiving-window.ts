/** Fail closed, including old pilot records without an explicit deadline. */
export function isReceivingWindowOpen(data: Record<string, unknown> | undefined, now = Date.now()): boolean {
  if (data?.open !== true || typeof data.openedAt !== 'string' || typeof data.closesAt !== 'string') return false;
  const start = Date.parse(data.openedAt);
  const end = Date.parse(data.closesAt);
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end && start < end;
}
