import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { openingRef } from '@/modules/cripta/lib/online-opening';
import { sealRef, currentInventory } from '@/modules/cripta/lib/seal-state';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { receiptDigest } from '@/modules/cripta/lib/seal-manifest';
import { resolveExpectedInventory } from '@/modules/cripta/lib/reopen-check';
import { createServerContainer } from '@vl6/infra';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !canAccessCriptaPilot(session.user.email))
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const snapshot = await openingRef(session.authContext.tenantId).get();
  return NextResponse.json(
    { open: snapshot.exists ? snapshot.data()?.open === true : true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (
    !canAccessCriptaPilot(session.user.email) ||
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const payload = (await request.json().catch(() => null)) as {
    open?: unknown;
    code?: unknown;
    minutes?: unknown;
    presentMemberId?: unknown;
    reason?: unknown;
  } | null;
  if (typeof payload?.open !== 'boolean')
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  const minutes = typeof payload.minutes === 'string' ? payload.minutes.trim() : '';
  const presentMemberId =
    typeof payload.presentMemberId === 'string' ? payload.presentMemberId : '';
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  if (minutes.length < 5 || minutes.length > 160)
    return NextResponse.json({ error: 'Informe a ata da sessão.' }, { status: 400 });
  const tenantId = session.authContext.tenantId;
  const db = getAdminFirestore();
  const [master, governance] = await Promise.all([
    currentCriptaMaster(tenantId),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
  ]);
  const designated = governance.data();
  const commission = Array.isArray(designated?.commissionMemberIds)
    ? (designated.commissionMemberIds as string[])
    : [];
  if (
    !master ||
    !commission.length ||
    !presentMemberId ||
    presentMemberId === master.member.id ||
    (!payload.open && !commission.includes(presentMemberId))
  ) {
    return NextResponse.json(
      { error: 'Nomeie a Comissão e confirme o Venerável vigente e o integrante presente.' },
      { status: 409 },
    );
  }
  const second = await createServerContainer().repositories.member.findById(presentMemberId);
  if (
    !second ||
    second.tenantId !== tenantId ||
    second.situacao !== 'ativo' ||
    !second.userId ||
    (payload.open && !commission.includes(presentMemberId) && reason.length < 8)
  ) {
    return NextResponse.json(
      {
        error:
          'O integrante deve estar Ativo. Para alguém fora da Comissão, registre o motivo na ata.',
      },
      { status: 409 },
    );
  }
  const ref = openingRef(tenantId);
  const seal = sealRef(tenantId);
  const at = new Date().toISOString();
  let inventory: Awaited<ReturnType<typeof currentInventory>> | undefined;
  if (payload.open) inventory = await currentInventory(tenantId);
  try {
    await db.runTransaction(async (transaction) => {
      const [previous, receipt] = await Promise.all([transaction.get(ref), transaction.get(seal)]);
      const isOpen = previous.exists ? previous.data()?.open === true : true;
      if (isOpen === payload.open) throw new Error('O estado já foi alterado. Atualize a tela.');
      if (payload.open) {
        const data = receipt.data();
        const expected = resolveExpectedInventory(
          data as Parameters<typeof resolveExpectedInventory>[0],
        );
        const cleaned =
          data?.cleanup?.receiptCode === data?.code && data?.cleanup?.complete === true;
        if (
          !data ||
          data.status !== 'sealed' ||
          typeof payload.code !== 'string' ||
          payload.code.trim().toUpperCase() !== data.code ||
          !expected ||
          expected.digest !== inventory?.digest ||
          expected.count !== inventory?.count ||
          receiptDigest(data as Parameters<typeof receiptDigest>[0]) !== data.receiptDigest
        ) {
          throw new Error(
            cleaned
              ? 'Restaure o arquivo .lacre da unidade física antes de reabrir a escrita.'
              : 'Lacre ausente, código incorreto ou inventário divergente. Suspenda a abertura e confira as unidades.',
          );
        }
        transaction.update(seal, {
          status: 'opened',
          openedAt: at,
          openedBy: session.user.id,
          openingMasterId: master.member.id,
          openingMemberId: presentMemberId,
          openingMinutes: minutes,
          actualOpeningDate: at.slice(0, 10),
        });
        transaction.create(seal.collection('events').doc(), {
          type: 'unsealed',
          code: data.code,
          inventoryDigest: inventory!.digest,
          at,
          minutes,
          masterId: master.member.id,
          presentMemberId,
          commissionMemberIds: commission,
          plannedOpeningDate: designated?.nextOpeningDate ?? null,
          reason: reason || null,
          actorId: session.user.id,
        });
      }
      transaction.set(ref, { open: payload.open, updatedAt: at, updatedBy: session.user.id });
      transaction.create(ref.collection('events').doc(), {
        type: payload.open ? 'opened' : 'closed',
        at,
        minutes,
        masterId: master.member.id,
        presentMemberId,
        commissionMemberIds: commission,
        plannedOpeningDate: designated?.nextOpeningDate ?? null,
        reason: reason || null,
        actorId: session.user.id,
      });
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Alteração não confirmada.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ open: payload.open }, { headers: { 'Cache-Control': 'no-store' } });
}
