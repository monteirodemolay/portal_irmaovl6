import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { CEREMONIES, eventsForCeremony, type Ceremony } from '@/modules/cripta/lib/ceremony-events';

export const runtime = 'nodejs';

/** Reads, never writes — joins the three ceremony event sources (see ceremony-events.ts) so the
 * Projetor and the relatório de anais each read one feed instead of three. */
export const GET = criptaRoute(async function GET(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  const ceremony = new URL(request.url).searchParams.get('ceremony');
  if (!ceremony || !(CEREMONIES as readonly string[]).includes(ceremony))
    return NextResponse.json({ error: 'Informe uma cerimônia válida.' }, { status: 400 });
  const events = await eventsForCeremony(session.authContext.tenantId, ceremony as Ceremony);
  return NextResponse.json(
    { ceremony, events },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
});
