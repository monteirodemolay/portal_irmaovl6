/** Central policy for the real vault. Pilot access does not authorize real deposits. */
export const CRIPTA_REAL_CONTENT_FLAG = 'CRIPTA_REAL_CONTENT_ENABLED';

export type VaultWindow = {
  opensAt: string;
  closesAt: string;
  status: 'scheduled' | 'open' | 'closed';
};

export function canAcceptRealContent(
  flag: string | undefined,
  window: VaultWindow | null,
  now: Date,
): boolean {
  if (flag !== 'true' || !window || window.status !== 'open') return false;
  const opensAt = Date.parse(window.opensAt);
  const closesAt = Date.parse(window.closesAt);
  return Number.isFinite(opensAt) && Number.isFinite(closesAt) &&
    opensAt < closesAt && now.getTime() >= opensAt && now.getTime() < closesAt;
}
