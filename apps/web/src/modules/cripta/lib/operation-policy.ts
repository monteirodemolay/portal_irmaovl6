/** Central policy for the real vault. Pilot access does not authorize real deposits. */
export const CRIPTA_REAL_CONTENT_FLAG = 'CRIPTA_REAL_CONTENT_ENABLED';

export type VaultWindow = {
  opensAt: string;
  closesAt: string;
  status: 'scheduled' | 'open' | 'closed';
};

/** Opening and closing are explicit instants; the close instant is exclusive. */
export function isTenDayWindow(window: VaultWindow): boolean {
  const start = Date.parse(window.opensAt);
  const end = Date.parse(window.closesAt);
  return Number.isFinite(start) && Number.isFinite(end) && end - start === 10 * 24 * 60 * 60 * 1000;
}

export function canAcceptRealContent(
  flag: string | undefined,
  window: VaultWindow | null,
  now: Date,
): boolean {
  if (flag !== 'true' || !window || window.status !== 'open') return false;
  const opensAt = Date.parse(window.opensAt);
  const closesAt = Date.parse(window.closesAt);
  return isTenDayWindow(window) && now.getTime() >= opensAt && now.getTime() < closesAt;
}
