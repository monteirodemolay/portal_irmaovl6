import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { isReceivingWindowOpen } from '@/modules/cripta/lib/receiving-window';
import { criptaCryptoRef } from '@/modules/cripta/lib/cripta-crypto-state';
import { openingRef } from '@/modules/cripta/lib/online-opening';
import { sealRef, currentInventory } from '@/modules/cripta/lib/seal-state';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { receiptDigest } from '@/modules/cripta/lib/seal-manifest';
import { resolveExpectedInventory } from '@/modules/cripta/lib/reopen-check';
import { createServerContainer } from '@vl6/infra';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const GET = criptaRoute(async function GET() {
  // criptaRoute already requires an active member session; any Irmão Ativo may check whether
  // the window is open (this backs both the admin controls and the member deposit screen).
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const snapshot = await openingRef(session.authContext.tenantId).get();
  return NextResponse.json(
    { open: isReceivingWindowOpen(snapshot.data()), closesAt: snapshot.data()?.closesAt ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});

export const POST = criptaRoute(async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const payload = (await request.json().catch(() => null)) as {
    open?: unknown;
    durationDays?: unknown;
    code?: unknown;
    minutes?: unknown;
    presentMemberId?: unknown;
    reason?: unknown;
  } | null;
  if (typeof payload?.open !== 'boolean')
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
  const durationDays = payload.durationDays ?? 10;
  if (
    payload.open &&
    (!Number.isInteger(durationDays) || Number(durationDays) < 1 || Number(durationDays) > 30)
  )
    return NextResponse.json({ error: 'Informe um período entre 1 e 30 dias.' }, { status: 400 });
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
      const isOpen = isReceivingWindowOpen(previous.data());
      if (isOpen && payload.open) throw new Error('O estado já foi alterado. Atualize a tela.');
      if (payload.open) {
        const data = receipt.data();
        const cryptoState = await transaction.get(criptaCryptoRef(tenantId));
        if (!cryptoState.data()?.publicKey)
          throw new Error('Inaugure a Cripta antes de abrir o recebimento.');
        const firstOpening = !receipt.exists && inventory?.count === 0;
        const expected = resolveExpectedInventory(
          data as Parameters<typeof resolveExpectedInventory>[0],
        );
        const cleaned =
          data?.cleanup?.receiptCode === data?.code && data?.cleanup?.complete === true;
        if (
          !firstOpening &&
          (!data ||
            data.status !== 'sealed' ||
            typeof payload.code !== 'string' ||
            payload.code.trim().toUpperCase() !== data.code ||
            expected?.digest !== inventory?.digest ||
            expected?.count !== inventory?.count ||
            receiptDigest(data as Parameters<typeof receiptDigest>[0]) !== data.receiptDigest)
        ) {
          throw new Error(
            cleaned
              ? 'Restaure o arquivo .lacre da unidade física antes de reabrir a escrita.'
              : 'Lacre ausente, código incorreto ou inventário divergente. Suspenda a abertura e confira as unidades.',
          );
        }
        if (!firstOpening)
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
          code: data?.code ?? null,
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
      transaction.set(ref, {
        open: payload.open,
        openedAt: payload.open ? at : (previous.data()?.openedAt ?? null),
        closesAt: payload.open
          ? new Date(Date.parse(at) + Number(durationDays) * 86400000).toISOString()
          : (previous.data()?.closesAt ?? null),
        updatedAt: at,
        updatedBy: session.user.id,
      });
      transaction.create(ref.collection('events').doc(), {
        type: payload.open ? 'opened' : 'closed',
        durationDays: payload.open ? durationDays : null,
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
});
