import { NextResponse } from 'next/server';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import { currentGuardianShares } from '@/modules/cripta/lib/guardian-shares';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Only public references leave the server. There is deliberately no upload/POST endpoint.
export const GET = criptaRoute(async function GET() {
  const session = await requirePagePermission('tenant:manage');
  const state = await readCriptaPublicKey(session.authContext.tenantId);
  const headers = { 'Cache-Control': 'no-store, private' };
  if (!state)
    return NextResponse.json(
      { error: 'A Cripta ainda não foi inaugurada.' },
      { status: 409, headers },
    );
  const shares = currentGuardianShares(state);
  const container = createServerContainer();
  const guardians = await Promise.all(
    shares.map(async (share) => {
      const member = await container.repositories.member.findById(share.memberId);
      return {
        name:
          member?.tenantId === session.authContext.tenantId
            ? member.nomeCompleto
            : 'Guardião registrado',
        status: share.status,
      };
    }),
  );
  return NextResponse.json(
    {
      publicKey: state.publicKey,
      totalGuardians: state.totalGuardians,
      threshold: state.threshold,
      guardianShareDigests: state.guardianShareDigests ?? [],
      guardians,
    },
    { headers },
  );
});
