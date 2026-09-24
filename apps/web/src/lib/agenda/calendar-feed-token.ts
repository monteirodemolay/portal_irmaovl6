import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';

const COLLECTION = 'calendarFeedTokens';

interface CalendarFeedTokenDocument {
  tenantId: string;
  userId: string;
  token: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function ownerDocumentId(tenantId: string, userId: string): string {
  return createHash('sha256').update(`${tenantId}:${userId}`).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function getOrCreateCalendarFeedToken(
  tenantId: string,
  userId: string,
): Promise<string> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(ownerDocumentId(tenantId, userId));
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data() as Partial<CalendarFeedTokenDocument>;
    if (data.active !== false && typeof data.token === 'string' && data.token.length >= 32) {
      return data.token;
    }
  }

  const token = generateToken();
  const now = new Date();
  await ref.set({
    tenantId,
    userId,
    token,
    active: true,
    createdAt: snap.exists ? (snap.data()?.createdAt ?? now) : now,
    updatedAt: now,
  } satisfies CalendarFeedTokenDocument);

  return token;
}

export async function rotateCalendarFeedToken(
  tenantId: string,
  userId: string,
): Promise<string> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(ownerDocumentId(tenantId, userId));
  const token = generateToken();
  const now = new Date();
  const snap = await ref.get();

  await ref.set({
    tenantId,
    userId,
    token,
    active: true,
    createdAt: snap.exists ? (snap.data()?.createdAt ?? now) : now,
    updatedAt: now,
  } satisfies CalendarFeedTokenDocument);

  return token;
}

export async function findCalendarFeedOwnerByToken(
  token: string,
): Promise<{ tenantId: string; userId: string } | null> {
  if (token.length < 32 || token.length > 128) return null;

  const db = getAdminFirestore();
  const snap = await db
    .collection(COLLECTION)
    .where('token', '==', token)
    .where('active', '==', true)
    .limit(1)
    .get();

  const data = snap.docs[0]?.data() as CalendarFeedTokenDocument | undefined;
  if (!data?.tenantId || !data.userId) return null;
  return { tenantId: data.tenantId, userId: data.userId };
}
