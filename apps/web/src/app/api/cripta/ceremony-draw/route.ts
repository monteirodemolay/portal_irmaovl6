import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { randomInt } from 'node:crypto';
import { createServerContainer } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { criptaCryptoRef, readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';

export const runtime = 'nodejs';
export const maxDuration = 30;
const headers = { 'Cache-Control': 'no-store, private' };
const TOTAL_GUARDIANS = 5;

/** Fisher-Yates with a CSPRNG index, not Math.random — the draw result decides who can later
 * reconstruct the Cripta's private key, so it must not be guessable or steerable by whoever
 * drives the ceremony screen. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export const POST = criptaRoute(async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const tenantId = session.authContext.tenantId;
  if (await readCriptaPublicKey(tenantId))
    return NextResponse.json(
      { error: 'A Cripta já foi inaugurada; o sorteio de Guardiões é um ato único.' },
      { status: 409 },
    );
  const body = (await request.json().catch(() => null)) as {
    presentMemberIds?: unknown;
    redraw?: unknown;
  } | null;
  const presentMemberIds = Array.isArray(body?.presentMemberIds)
    ? (body!.presentMemberIds as unknown[])
    : [];
  if (
    presentMemberIds.length < TOTAL_GUARDIANS ||
    !presentMemberIds.every((id): id is string => typeof id === 'string' && id.length > 0) ||
    new Set(presentMemberIds).size !== presentMemberIds.length
  ) {
    return NextResponse.json(
      { error: `Informe ao menos ${TOTAL_GUARDIANS} Irmãos presentes, sem repetição.` },
      { status: 400 },
    );
  }
  const master = await currentCriptaMaster(tenantId);
  if (!master)
    return NextResponse.json(
      { error: 'Cadastre o Venerável Mestre vigente antes do sorteio.' },
      { status: 409 },
    );
  const container = createServerContainer();
  const members = await Promise.all(
    (presentMemberIds as string[]).map((id) => container.repositories.member.findById(id)),
  );
  if (
    members.some(
      (member) =>
        !member ||
        member.tenantId !== tenantId ||
        member.situacao !== 'ativo' ||
        !member.userId ||
        member.id === master.member.id,
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Cada presente precisa ser um Irmão Ativo com conta vinculada, e nenhum deles pode ser o Venerável.',
      },
      { status: 400 },
    );
  }
  const drawn = shuffle(presentMemberIds as string[]).slice(0, TOTAL_GUARDIANS);
  const at = new Date().toISOString();
  const result = {
    guardianMemberIds: drawn,
    presentMemberIds: presentMemberIds as string[],
    at,
    actorId: session.user.id,
  };
  await criptaCryptoRef(tenantId)
    .collection('events')
    .doc()
    .create({
      type: body?.redraw ? 'sorteio.redraw' : 'sorteio.resultado',
      ...result,
    });
  return NextResponse.json({ result }, { status: 201, headers });
});
