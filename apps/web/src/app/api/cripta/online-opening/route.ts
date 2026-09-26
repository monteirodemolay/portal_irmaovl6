import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { openingRef } from '@/modules/cripta/lib/online-opening';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !canAccessCriptaPilot(session.user.email)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const snapshot = await openingRef(session.authContext.tenantId).get();
  return NextResponse.json({ open: snapshot.data()?.open === true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email) || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const payload = await request.json().catch(() => null) as { open?: unknown } | null;
  if (typeof payload?.open !== 'boolean') return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  const ref = openingRef(session.authContext.tenantId);
  const event = ref.collection('events').doc();
  const at = new Date().toISOString();
  const db = getAdminFirestore();
  const batch = db.batch();
  batch.set(ref, { open: payload.open, updatedAt: at, updatedBy: session.user.id });
  batch.create(event, { type: payload.open ? 'opened' : 'closed', at, actorId: session.user.id });
  await batch.commit();
  return NextResponse.json({ open: payload.open }, { headers: { 'Cache-Control': 'no-store' } });
}
