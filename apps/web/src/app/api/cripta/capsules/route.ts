import { randomUUID } from 'node:crypto';
import { hasPermission } from '@vl6/domain';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { cancelReservation, finalizeCapsule, listCapsules, readWindow, reserveCapsule } from '@/modules/cripta/lib/vault-inventory';
import { canAcceptRealContent } from '@/modules/cripta/lib/operation-policy';
import { deletePrivateCiphertext, uploadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function pilotSession() {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'tenant:manage') || !canAccessCriptaPilot(session.user.email)) return null;
  return session;
}

export async function GET() {
  const session = await pilotSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const window = await readWindow();
  return NextResponse.json({
    items: await listCapsules(session.user.id),
    canDeposit: canAcceptRealContent(process.env.CRIPTA_REAL_CONTENT_ENABLED, window, new Date()),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const session = await pilotSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  const window = await readWindow();
  if (!canAcceptRealContent(process.env.CRIPTA_REAL_CONTENT_ENABLED, window, new Date())) {
    return NextResponse.json({ error: 'Cripta fechada para depósitos reais.' }, { status: 423 });
  }
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1_500_000) return NextResponse.json({ error: 'Pacote acima do limite.' }, { status: 413 });
  let id: string | undefined;
  let fileId: string | undefined;
  try {
    const body = await request.text();
    if (body.length > 1_500_000 || body.length < 100) return NextResponse.json({ error: 'Pacote inválido.' }, { status: 400 });
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') return NextResponse.json({ error: 'Pacote inválido.' }, { status: 400 });
    const envelope = parsed as Record<string, unknown>;
    if (envelope.format !== 'vl6-capsule-v1' || envelope.cipher !== 'AES-256-GCM' ||
        envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== 600_000 ||
        !['salt', 'nonce', 'ciphertext'].every((key) => typeof envelope[key] === 'string')) {
      return NextResponse.json({ error: 'Formato cifrado inválido.' }, { status: 400 });
    }
    id = randomUUID();
    await reserveCapsule(session.user.id, id);
    const uploaded = await uploadPrivateCiphertext(Buffer.from(body, 'utf8'));
    fileId = uploaded.fileId;
    await finalizeCapsule(session.user.id, id, fileId, uploaded.sha256, Buffer.byteLength(body));
    return NextResponse.json({ id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (fileId) { try { await deletePrivateCiphertext(fileId); } catch { /* reconcile later */ } }
    if (id) await cancelReservation(session.user.id, id);
    return NextResponse.json({ error: 'Falha ao armazenar pacote cifrado.' }, { status: 502 });
  }
}
