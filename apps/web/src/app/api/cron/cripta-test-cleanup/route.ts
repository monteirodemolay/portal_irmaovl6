import { getAdminFirestore } from '@vl6/infra';
import { NextResponse, type NextRequest } from 'next/server';
import { requireCronSecret } from '@/lib/api/require-cron-secret';
import { deletePrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const expired = await getAdminFirestore().collection('criptaTestCapsulesV1')
    .where('expiresAt', '<=', new Date().toISOString()).limit(40).get();
  let deleted = 0;
  let failed = 0;
  for (const doc of expired.docs) {
    try {
      await deletePrivateCiphertext(doc.data().fileId as string);
      await doc.ref.delete();
      deleted++;
    } catch { failed++; }
  }
  return NextResponse.json({ deleted, failed }, { status: failed ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' } });
}
