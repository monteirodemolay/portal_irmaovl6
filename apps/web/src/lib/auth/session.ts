import 'server-only';
import { getAdminAuth } from '@vl6/infra';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { SESSION_COOKIE_MAX_AGE_MS } from './session-constants';

export { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_MS } from './session-constants';

export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn: SESSION_COOKIE_MAX_AGE_MS });
}

export async function verifySessionCookie(cookie: string): Promise<DecodedIdToken | null> {
  try {
    return await getAdminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

export async function revokeAllSessions(uid: string): Promise<void> {
  await getAdminAuth().revokeRefreshTokens(uid);
}
