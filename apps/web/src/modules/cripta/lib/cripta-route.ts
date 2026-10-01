import 'server-only';
import { criptaStorageScope } from './storage-scope';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from './early-access';
import { acquireCriptaOperation, CriptaBlocked, CriptaStaleCycle } from './reset-control';

/** Covers the complete handler, including downloads, uploads and compensating cleanup. */
export function criptaRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    const session = await getCurrentSession();
    if (!session || !canAccessCriptaPilot(session.user.email))
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    const request = args[0] instanceof Request ? args[0] : undefined;
    if (
      request &&
      !['GET', 'HEAD'].includes(request.method) &&
      request.headers.get('origin') !== new URL(request.url).origin
    )
      return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    const isDraftWrite =
      request &&
      ['PUT', 'DELETE'].includes(request.method) &&
      new URL(request.url).pathname === '/api/cripta/draft';
    const expected = isDraftWrite
      ? Number(request.headers.get('X-Cripta-Generation') ?? '0')
      : undefined;
    let operation;
    try {
      operation = await acquireCriptaOperation(session.authContext.tenantId, expected);
    } catch (error) {
      if (!(error instanceof CriptaBlocked) && !(error instanceof CriptaStaleCycle)) throw error;
      return NextResponse.json(
        { error: error.message },
        { status: error instanceof CriptaBlocked ? 423 : 409 },
      );
    }
    try {
      const response = await criptaStorageScope.run(
        { tenantId: session.authContext.tenantId, uid: session.user.id },
        () => handler(...args),
      );
      response.headers.set('X-Cripta-Generation', String(operation.generation));
      return response;
    } finally {
      await operation.release();
    }
  };
}
