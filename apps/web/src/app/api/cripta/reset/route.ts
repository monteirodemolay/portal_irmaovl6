import { NextResponse } from 'next/server';
import { hasPermission } from '@vl6/domain';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { readResetStatus, startReset, continueReset } from '@/modules/cripta/lib/reset-service';

export const runtime = 'nodejs';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'no-store, private' };
async function administrator() {
  const session = await getCurrentSession();
  return session && hasPermission(session.authContext, 'tenant:manage') ? session : null;
}
export async function GET() {
  const session = await administrator();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers });
  return NextResponse.json(await readResetStatus(session.authContext.tenantId, session.user.id), {
    headers,
  });
}
export async function POST(request: Request) {
  const session = await administrator();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers });
  let body: {
    action?: string;
    confirmation?: string;
    generation?: number;
    resetId?: string;
    externalCopiesAcknowledged?: boolean;
  };
  try {
    const text = await request.text();
    if (text.length > 2048) throw new Error();
    body = JSON.parse(text);
    if (!body || typeof body !== 'object') throw new Error();
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400, headers });
  }
  const tenantId = session.authContext.tenantId;
  try {
    if (body.action === 'start') {
      if (
        body.confirmation !== 'ZERAR CRIPTA' ||
        body.externalCopiesAcknowledged !== true ||
        !Number.isSafeInteger(body.generation) ||
        body.generation! < 0
      )
        return NextResponse.json(
          { error: 'Confira a exclusão e digite ZERAR CRIPTA.' },
          { status: 400, headers },
        );
      await startReset(tenantId, session.user.id, body.generation!);
      return NextResponse.json(await readResetStatus(tenantId, session.user.id), {
        status: 202,
        headers,
      });
    }
    if (
      body.action === 'continue' &&
      typeof body.resetId === 'string' &&
      /^[a-f0-9-]{36}$/.test(body.resetId)
    )
      return NextResponse.json(await continueReset(tenantId, session.user.id, body.resetId), {
        headers,
      });
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400, headers });
  } catch {
    return NextResponse.json(
      {
        error:
          'Operação não concluída. Atualize a conferência e retome a zerada; a Cripta permanece bloqueada se a limpeza já começou.',
      },
      { status: 409, headers },
    );
  }
}
