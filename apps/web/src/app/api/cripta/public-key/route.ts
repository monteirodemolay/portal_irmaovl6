import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { NextResponse } from 'next/server';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** The Cripta's public key is not secret, but this stays behind the pilot gate like every
 * other Cripta route until general release. */
export const GET = criptaRoute(async function GET() {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const state = await readCriptaPublicKey(session.authContext.tenantId);
  if (!state)
    return NextResponse.json({ error: 'A Cripta ainda não foi inaugurada.' }, { status: 404 });
  return NextResponse.json(
    {
      publicKey: state.publicKey,
      threshold: state.threshold,
      totalGuardians: state.totalGuardians,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});
