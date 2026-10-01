import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const POST = criptaRoute(async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (
    !canAccessCriptaPilot(session.user.email) ||
    request.headers.get('origin') !== new URL(request.url).origin
  )
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  // The current offline tool cannot restore account-encrypted drafts or legacy letters.
  // Never delete the only recoverable source based solely on matching file hashes.
  return NextResponse.json(
    {
      error:
        'Limpeza bloqueada: a restauração integral de rascunhos e cartas legadas ainda não foi validada. Os arquivos permanecem preservados no Wix.',
    },
    { status: 409, headers: { 'Cache-Control': 'no-store, private' } },
  );
});
