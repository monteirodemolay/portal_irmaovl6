import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { randomBytes } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { isReceivingWindowOpen } from '@/modules/cripta/lib/receiving-window';
import { openingRef } from '@/modules/cripta/lib/online-opening';
import { currentInventory, sealRef } from '@/modules/cripta/lib/seal-state';
import { receiptDigest } from '@/modules/cripta/lib/seal-manifest';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store, private' };

async function access(request?: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (
    !canAccessCriptaPilot(session.user.email) ||
    (request && request.headers.get('origin') !== new URL(request.url).origin)
  )
    return null;
  return session;
}

export const GET = criptaRoute(async function GET() {
  const session = await access();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const snap = await sealRef(session.authContext.tenantId).get();
  const receipt = snap.data();
  if (!receipt) return NextResponse.json({ receipt: null }, { headers });
  try {
    const actual = await currentInventory(session.authContext.tenantId);
    return NextResponse.json(
      {
        receipt,
        check: {
          inventoryMatches:
            actual.digest === receipt.inventoryDigest && actual.count === receipt.count,
          receiptMatches:
            receiptDigest(receipt as Parameters<typeof receiptDigest>[0]) === receipt.receiptDigest,
          currentDigest: actual.digest,
          currentCount: actual.count,
        },
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { receipt, check: { inventoryMatches: false, error: 'Inventário indisponível.' } },
      { headers },
    );
  }
});

export const POST = criptaRoute(async function POST(request: Request) {
  const session = await access(request);
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { minutes?: unknown } | null;
  const minutes = typeof body?.minutes === 'string' ? body.minutes.trim() : '';
  if (minutes.length < 5 || minutes.length > 160)
    return NextResponse.json({ error: 'Informe a ata desta lacração.' }, { status: 400 });
  const tenantId = session.authContext.tenantId;
  const db = getAdminFirestore();
  const master = await currentCriptaMaster(tenantId);
  const governance = (await db.collection('criptaGovernanceV1').doc(tenantId).get()).data();
  const commissionMemberIds = Array.isArray(governance?.commissionMemberIds)
    ? (governance.commissionMemberIds as string[])
    : [];
  if (!master || !commissionMemberIds.length || !governance?.nextOpeningDate) {
    return NextResponse.json(
      { error: 'Nomeie a Comissão de Guarda e indique a próxima data antes da lacração.' },
      { status: 409 },
    );
  }
  try {
    const inventory = await currentInventory(tenantId);
    const opening = await openingRef(tenantId).get();
    if (isReceivingWindowOpen(opening.data())) {
      return NextResponse.json(
        { error: 'Feche o recebimento antes de gerar o recibo.' },
        { status: 409 },
      );
    }
    const ref = sealRef(tenantId);
    const current = await ref.get();
    if (current.exists && current.data()?.status === 'sealed') {
      return NextResponse.json(
        { error: 'Já existe um lacre vigente. Confira-o antes da próxima abertura.' },
        { status: 409 },
      );
    }
    const previousCode =
      typeof current.data()?.code === 'string' ? (current.data()!.code as string) : null;
    const sealedAt = new Date().toISOString();
    const localDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date())
      .replaceAll('-', '');
    const code = `VL6-${localDay}-${randomBytes(6).toString('hex').toUpperCase()}`;
    const canonical = {
      code,
      sealedAt,
      inventoryDigest: inventory.digest,
      previousCode,
      minutes,
      closingMasterId: master.member.id,
      closingSecondId: commissionMemberIds[0]!,
      commissionMemberIds,
      nextOpeningDate: governance.nextOpeningDate as string,
    };
    const receipt = {
      ...canonical,
      receiptDigest: receiptDigest(canonical),
      count: inventory.count,
      letters: inventory.letters,
      drafts: inventory.drafts,
      status: 'sealed',
      version: 1,
      commissionMemberIds,
      nextOpeningDate: governance.nextOpeningDate,
      createdBy: session.user.id,
      note: 'Recibo do inventário registrado; cópias externas exigem conferência separada.',
    };
    await db.runTransaction(async (transaction) => {
      const [state, previous] = await Promise.all([
        transaction.get(openingRef(tenantId)),
        transaction.get(ref),
      ]);
      if (
        isReceivingWindowOpen(state.data()) ||
        previous.data()?.status === 'sealed' ||
        (previous.exists && previous.data()?.code !== previousCode)
      )
        throw new Error('Estado alterado durante a lacração.');
      transaction.set(ref, receipt);
      transaction.create(ref.collection('events').doc(), {
        ...receipt,
        type: 'sealed',
        actorId: session.user.id,
      });
    });
    return NextResponse.json({ receipt }, { status: 201, headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível lacrar.' },
      { status: 409 },
    );
  }
});
