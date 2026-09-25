import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import { deletePrivateCiphertext, uploadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 60;
const collection = () => getAdminFirestore().collection('criptaOnlineCapsulesV1');

export async function GET() {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const docs = await collection().where('tenantId', '==', session.authContext.tenantId).where('uid', '==', session.user.id).get();
  return NextResponse.json({ items: docs.docs.filter((doc) => doc.data().status === 'ready').map((doc) => ({
    id: doc.id, createdAt: doc.data().createdAt,
  })) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await activeCriptaSession();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > 1_500_000) {
    return NextResponse.json({ error: 'Carta acima do limite atual de 1,5 MB cifrados.' }, { status: 413 });
  }
  const body = await request.text();
  if (Buffer.byteLength(body) > 1_500_000 || body.length < 100) {
    return NextResponse.json({ error: 'Pacote inválido.' }, { status: 413 });
  }
  let envelope: Record<string, unknown>;
  try { envelope = JSON.parse(body) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Pacote inválido.' }, { status: 400 }); }
  if (envelope.format !== 'vl6-capsule-v1' || envelope.cipher !== 'AES-256-GCM' ||
      envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== 600_000 ||
      !['salt', 'nonce', 'ciphertext'].every((field) => typeof envelope[field] === 'string')) {
    return NextResponse.json({ error: 'Pacote cifrado inválido.' }, { status: 400 });
  }
  const existing = await collection().where('tenantId', '==', session.authContext.tenantId).where('uid', '==', session.user.id).get();
  if (existing.docs.filter((doc) => doc.data().status === 'ready').length >= 5) {
    return NextResponse.json({ error: 'Limite de cinco cartas. Exclua ou substitua uma carta antes de continuar.' }, { status: 409 });
  }
  let fileId: string | undefined;
  try {
    const uploaded = await uploadPrivateCiphertext(Buffer.from(body, 'utf8'));
    fileId = uploaded.fileId;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await collection().doc(id).create({ tenantId: session.authContext.tenantId, uid: session.user.id,
      fileId, sha256: uploaded.sha256, createdAt, status: 'ready' });
    return NextResponse.json({ id, createdAt }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (fileId) { try { await deletePrivateCiphertext(fileId); } catch { /* reconcile orphan */ } }
    return NextResponse.json({ error: 'O envio não foi confirmado. Tente novamente.' }, { status: 502 });
  }
}
