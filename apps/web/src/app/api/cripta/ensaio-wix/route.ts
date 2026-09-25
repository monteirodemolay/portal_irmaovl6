import { hasPermission } from '@vl6/domain';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { runWixTestCycle } from '@/modules/cripta/lib/wix-test-cycle';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'tenant:manage') || !canAccessCriptaPilot(session.user.email)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  try {
    return NextResponse.json(await runWixTestCycle(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Never echo Wix response bodies, signed URLs or the API key.
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ensaio Wix falhou.' }, { status: 502 });
  }
}
