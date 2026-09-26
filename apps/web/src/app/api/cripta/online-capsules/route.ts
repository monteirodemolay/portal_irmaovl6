import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import { deletePrivateCiphertext, downloadPrivateCiphertext, uploadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { sealForAccount } from '@/modules/cripta/lib/account-envelope';
import { parseOnlineLetter } from '@/modules/cripta/lib/online-letter';

export const runtime = 'nodejs';
export const maxDuration = 60;
const collection = () => getAdminFirestore().collection('criptaOnlineCapsulesV1');

export async function GET() {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const docs = await collection().where('uid', '==', session.user.id).get();
  return NextResponse.json({ items: docs.docs.filter((doc) => doc.data().tenantId === session.authContext.tenantId && doc.data().status === 'ready').map((doc) => ({
    id: doc.id, createdAt: doc.data().createdAt, legacy: doc.data().format !== 'vl6-account-letter-v1',
  })) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await activeCriptaSession();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!await isOnlineOpen(session.authContext.tenantId)) {
    return NextResponse.json({ error: 'O recebimento de cartas está fechado. Aguarde a abertura pela Administração.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > 1_000_000) {
    return NextResponse.json({ error: 'Carta acima do limite atual de 1 MB.' }, { status: 413 });
  }
  const body = await request.text();
  if (Buffer.byteLength(body) > 1_000_000 || body.length < 20) {
    return NextResponse.json({ error: 'Pacote inválido.' }, { status: 413 });
  }
  try { parseOnlineLetter(body, true); }
  catch { return NextResponse.json({ error: 'Pacote inválido.' }, { status: 400 }); }
  const existing = await collection().where('uid', '==', session.user.id).get();
  if (existing.docs.filter((doc) => doc.data().tenantId === session.authContext.tenantId && doc.data().status === 'ready').length >= 5) {
    return NextResponse.json({ error: 'Limite de cinco cartas. Exclua ou substitua uma carta antes de continuar.' }, { status: 409 });
  }
  let fileId: string | undefined;
  try {
    const id = randomUUID();
    const encrypted = await sealForAccount(Buffer.from(body, 'utf8'), session.authContext.tenantId, session.user.id, id);
    const uploaded = await uploadPrivateCiphertext(encrypted);
    fileId = uploaded.fileId;
    await downloadPrivateCiphertext(uploaded.fileId, uploaded.sha256);
    const createdAt = new Date().toISOString();
    await collection().doc(id).create({ tenantId: session.authContext.tenantId, uid: session.user.id,
      fileId, sha256: uploaded.sha256, createdAt, status: 'ready', format: 'vl6-account-letter-v1' });
    return NextResponse.json({ id, createdAt }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (fileId) { try { await deletePrivateCiphertext(fileId); } catch { /* reconcile orphan */ } }
    return NextResponse.json({ error: 'O envio não foi confirmado. Tente novamente.' }, { status: 502 });
  }
}
