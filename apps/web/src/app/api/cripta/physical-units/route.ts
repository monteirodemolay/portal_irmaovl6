import { buildPenDriveCode } from '@/modules/cripta/lib/physical-unit';
import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { sealRef } from '@/modules/cripta/lib/seal-state';
import { receiptDigest } from '@/modules/cripta/lib/seal-manifest';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store, private' };

export async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (
    !canAccessCriptaPilot(session.user.email) ||
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.code !== 'string' ||
    !/^(?:LAC-[A-Z0-9-]{5,48}|VL6-[A-Z0-9-]{8,48})$/.test(body.code) ||
    typeof body.fingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.fingerprint) ||
    !Number.isSafeInteger(body.size) ||
    (body.size as number) < 44 ||
    typeof body.inventoryDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.inventoryDigest) ||
    !Number.isSafeInteger(body.totalLetters) ||
    (body.totalLetters as number) < 0 ||
    !Array.isArray(body.units) ||
    body.units.length !== 3 ||
    body.units.some((unit) => typeof unit !== 'string' || !/^[A-Z0-9-]{6,80}$/.test(unit)) ||
    new Set(body.units).size !== 3 ||
    !['A', 'B', 'C'].every((unit) =>
      (body.units as string[]).includes(buildPenDriveCode(body.code as string, unit)),
    )
  ) {
    return NextResponse.json({ error: 'Resultado da conferência inválido.' }, { status: 400 });
  }
  const ref = sealRef(session.authContext.tenantId);
  const receipt = await ref.get();
  const data = receipt.data();
  if (
    !data ||
    data.status !== 'sealed' ||
    data.code !== body.code ||
    data.letters !== body.totalLetters ||
    data.inventoryDigest !== body.inventoryDigest ||
    receiptDigest(data as Parameters<typeof receiptDigest>[0]) !== data.receiptDigest
  ) {
    return NextResponse.json(
      { error: 'O recibo vigente não corresponde às unidades selecionadas.' },
      { status: 409 },
    );
  }
  const evidence = {
    code: body.code,
    fingerprint: body.fingerprint,
    size: body.size,
    totalLetters: body.totalLetters,
    units: body.units,
    receiptDigest: data.receiptDigest,
    inventoryDigest: data.inventoryDigest,
    method: 'browser-file-read',
    checkedAt: new Date().toISOString(),
    operatorId: session.user.id,
  };
  try {
    await getAdminFirestore().runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (
        current.data()?.status !== 'sealed' ||
        current.data()?.receiptDigest !== data.receiptDigest
      ) {
        throw new Error('O recibo mudou durante a conferência. Repita a leitura.');
      }
      transaction.create(ref.collection('physicalChecks').doc(randomUUID()), evidence);
      transaction.update(ref, { physicalCheck: evidence });
    });
    return NextResponse.json({ evidence }, { headers });
  } catch {
    return NextResponse.json(
      { error: 'A conferência não foi registrada. Repita a leitura.' },
      { status: 409 },
    );
  }
}
