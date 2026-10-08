import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentWizardStatus } from '@/modules/cripta/lib/wizard-status';

export const runtime = 'nodejs';

/** Read-only, polled by the Projetor so the big screen always reflects the same phase the
 * Administração page would show, without the Projetor ever writing anything itself. */
export const GET = criptaRoute(async function GET() {
  const session = await requirePagePermission('tenant:manage');
  const wizard = await currentWizardStatus(session.authContext.tenantId);
  return NextResponse.json({ wizard }, { headers: { 'Cache-Control': 'no-store, private' } });
});
