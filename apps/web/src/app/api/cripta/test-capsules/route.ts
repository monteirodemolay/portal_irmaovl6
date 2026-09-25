import { randomUUID } from 'node:crypto';
import { hasPermission } from '@vl6/domain';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { deletePrivateCiphertext, uploadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 60;
const collection = () => getAdminFirestore().collection('criptaTestCapsulesV1');

async function pilot() {
  const session = await getCurrentSession();
  return session && hasPermission(session.authContext, 'tenant:manage') && canAccessCriptaPilot(session.user.email)
    ? session : null;
}

export async function GET() {
  const session = await pilot();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const docs = await collection().where('uid', '==', session.user.id).get();
  const now = new Date().toISOString();
  return NextResponse.json({ items: docs.docs.filter((doc) => doc.data().expiresAt > now).map((doc) => ({
    id: doc.id, createdAt: doc.data().createdAt, expiresAt: doc.data().expiresAt,
  })) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await pilot();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > 1_500_000) {
    return NextResponse.json({ error: 'Ensaio limitado a 1,5 MB cifrados.' }, { status: 413 });
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > 1_500_000 || text.length < 100) {
    return NextResponse.json({ error: 'Pacote de teste inválido.' }, { status: 413 });
  }
  let envelope: Record<string, unknown>;
  try { envelope = JSON.parse(text) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Pacote de teste inválido.' }, { status: 400 }); }
  if (envelope?.format !== 'vl6-capsule-v1' || envelope.cipher !== 'AES-256-GCM' ||
      envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== 600_000 ||
      !['salt', 'nonce', 'ciphertext'].every((field) => typeof envelope[field] === 'string')) {
    return NextResponse.json({ error: 'Formato cifrado inválido.' }, { status: 400 });
  }
  const existing = await collection().where('uid', '==', session.user.id).get();
  if (existing.docs.filter((doc) => doc.data().expiresAt > new Date().toISOString()).length >= 5) {
    return NextResponse.json({ error: 'Limite de cinco cartas fictícias ativas.' }, { status: 409 });
  }
  let fileId: string | undefined;
  try {
    const uploaded = await uploadPrivateCiphertext(Buffer.from(text, 'utf8'));
    fileId = uploaded.fileId;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    await collection().doc(id).create({ uid: session.user.id, fileId, sha256: uploaded.sha256,
      createdAt, expiresAt, kind: 'fictional-test-only' });
    return NextResponse.json({ id, createdAt, expiresAt }, { status: 201,
      headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (fileId) { try { await deletePrivateCiphertext(fileId); } catch { /* manual reconciliation required */ } }
    return NextResponse.json({ error: 'Falha no ensaio. Não presuma que houve depósito.' }, { status: 502 });
  }
}
