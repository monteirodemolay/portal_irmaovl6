import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { criptaCryptoRef, readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import type { CriptaPublicKey } from '@/modules/cripta/lib/cripta-key';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store, private' };
const BASE64URL = /^[A-Za-z0-9_-]{40,48}$/;

function isPublicKey(value: unknown): value is CriptaPublicKey {
  if (!value || typeof value !== 'object') return false;
  const key = value as Record<string, unknown>;
  return (
    key.kty === 'EC' &&
    key.crv === 'P-256' &&
    typeof key.x === 'string' &&
    BASE64URL.test(key.x) &&
    typeof key.y === 'string' &&
    BASE64URL.test(key.y)
  );
}

export async function GET() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email))
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const state = await readCriptaPublicKey(session.authContext.tenantId);
  return NextResponse.json({ inaugurated: !!state, state }, { headers });
}

/** This route only ever receives the Cripta's PUBLIC key plus ceremony metadata. The private
 * scalar and every Shamir share are generated and split in the browser and discarded there —
 * they must never be sent here or appear in any request the server logs. */
export async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (
    !canAccessCriptaPilot(session.user.email) ||
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const tenantId = session.authContext.tenantId;
  const master = await currentCriptaMaster(tenantId);
  if (!master)
    return NextResponse.json(
      {
        error:
          'Cadastre o Venerável Mestre na gestão vigente e vincule sua conta antes da inauguração.',
      },
      { status: 409 },
    );

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const guardianMemberIds = Array.isArray(body?.guardianMemberIds)
    ? (body!.guardianMemberIds as unknown[])
    : [];
  const totalGuardians = body?.totalGuardians;
  const threshold = body?.threshold;
  const minutes = typeof body?.minutes === 'string' ? body.minutes.trim() : '';
  if (
    !isPublicKey(body?.publicKey) ||
    !Number.isInteger(totalGuardians) ||
    (totalGuardians as number) < 2 ||
    (totalGuardians as number) > 15 ||
    !Number.isInteger(threshold) ||
    (threshold as number) < 2 ||
    (threshold as number) > (totalGuardians as number) ||
    guardianMemberIds.length !== totalGuardians ||
    !guardianMemberIds.every((id): id is string => typeof id === 'string' && id.length > 0) ||
    new Set(guardianMemberIds).size !== guardianMemberIds.length ||
    (guardianMemberIds as string[]).includes(master.member.id) ||
    minutes.length < 5 ||
    minutes.length > 160
  ) {
    return NextResponse.json(
      {
        error:
          'Confira a chave pública, a lista de Guardiões (sem repetição, sem o Venerável) e a ata.',
      },
      { status: 400 },
    );
  }
  const container = createServerContainer();
  const members = await Promise.all(
    (guardianMemberIds as string[]).map((id) => container.repositories.member.findById(id)),
  );
  if (
    members.some(
      (member) =>
        !member || member.tenantId !== tenantId || member.situacao !== 'ativo' || !member.userId,
    )
  ) {
    return NextResponse.json(
      { error: 'Todo Guardião precisa ser um Irmão Ativo com conta vinculada ao Portal.' },
      { status: 400 },
    );
  }

  const db = getAdminFirestore();
  const ref = criptaCryptoRef(tenantId);
  const inauguratedAt = new Date().toISOString();
  const state = {
    publicKey: body!.publicKey as CriptaPublicKey,
    totalGuardians: totalGuardians as number,
    threshold: threshold as number,
    guardianMemberIds: guardianMemberIds as string[],
    minutes,
    masterId: master.member.id,
    inauguratedAt,
  };
  try {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (current.exists && current.data()?.publicKey) throw new Error('ALREADY_INAUGURATED');
      transaction.set(ref, state);
      transaction.create(ref.collection('events').doc(), {
        type: 'inaugurated',
        ...state,
        actorId: session.user.id,
      });
    });
    return NextResponse.json({ state }, { status: 201, headers });
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_INAUGURATED') {
      return NextResponse.json(
        {
          error:
            'A Cripta já foi inaugurada. Rotação de chave é um ato à parte, ainda não implementado.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Não foi possível registrar a inauguração.' },
      { status: 502 },
    );
  }
}
