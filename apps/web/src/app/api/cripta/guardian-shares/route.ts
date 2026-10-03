import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { createServerContainer } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import {
  criptaCryptoRef,
  currentGuardianShares,
  guardianAlertLevel,
  isGuardianShareStatus,
  validShareCount,
} from '@/modules/cripta/lib/guardian-shares';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store, private' };

/** Read-only view of how many of the 5 Shamir shares the Loja still trusts — never the shares
 * themselves, which never exist on the Portal. See guardian-shares-shape.ts for why this is a
 * tracking/alert mechanism, not a revocation mechanism. */
export const GET = criptaRoute(async function GET() {
  const session = await requirePagePermission('tenant:manage');
  const state = await readCriptaPublicKey(session.authContext.tenantId);
  if (!state) return NextResponse.json({ inaugurated: false }, { headers });
  const shares = currentGuardianShares(state);
  const container = createServerContainer();
  const members = await Promise.all(
    shares.map((share) => container.repositories.member.findById(share.memberId)),
  );
  const validCount = validShareCount(shares);
  return NextResponse.json(
    {
      inaugurated: true,
      total: state.totalGuardians,
      threshold: state.threshold,
      validCount,
      alertLevel: guardianAlertLevel(validCount, state.totalGuardians, state.threshold),
      guardians: shares.map((share, index) => ({
        memberId: share.memberId,
        name: members[index]?.nomeCompleto ?? 'Irmão não encontrado',
        status: share.status,
      })),
    },
    { headers },
  );
});

export const PATCH = criptaRoute(async function PATCH(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    memberId?: unknown;
    status?: unknown;
    reason?: unknown;
  } | null;
  if (typeof body?.memberId !== 'string' || !isGuardianShareStatus(body.status))
    return NextResponse.json({ error: 'Informe o Guardião e o novo status.' }, { status: 400 });
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
  const tenantId = session.authContext.tenantId;
  const ref = criptaCryptoRef(tenantId);
  try {
    const result = await ref.firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.data();
      if (!data?.publicKey) throw new Error('A Cripta ainda não foi inaugurada.');
      const shares = currentGuardianShares(data as Parameters<typeof currentGuardianShares>[0]);
      const index = shares.findIndex((share) => share.memberId === body.memberId);
      if (index === -1) throw new Error('Este Irmão não é Guardião desta Cripta.');
      const total = data.totalGuardians as number;
      const threshold = data.threshold as number;
      if (shares[index]!.status === body.status) return { shares, total, threshold };
      const next = shares.map((share, i) =>
        i === index ? { ...share, status: body.status as (typeof share)['status'] } : share,
      );
      const at = new Date().toISOString();
      transaction.update(ref, { guardianShares: next });
      transaction.create(ref.collection('events').doc(), {
        type: body.status === 'comprometida' ? 'parte.comprometida' : 'parte.revalidada',
        memberId: body.memberId,
        reason: reason || null,
        at,
        actorId: session.user.id,
      });
      return { shares: next, total, threshold };
    });
    const validCount = validShareCount(result.shares);
    return NextResponse.json(
      { validCount, alertLevel: guardianAlertLevel(validCount, result.total, result.threshold) },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível atualizar.' },
      { status: 409 },
    );
  }
});
