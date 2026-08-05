import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, logger } from '@vl6/shared';

/**
 * Envolve um handler de rota `/api/v1/**` (docs/architecture/10-roadmap.md
 * v1.3, "logging estruturado" + "alertas de erro") — nenhuma rota tinha
 * try/catch antes disso, então uma exceção não tratada (erro do Firestore,
 * timeout, etc.) virava um 500 genérico do Next sem registro nenhum. Como
 * o erro é capturado aqui (não propaga pro Next), o hook `onRequestError`
 * de `src/instrumentation.ts` nunca veria essas exceções sozinho — por
 * isso reporta explicitamente ao Sentry também. `routeName` identifica a
 * rota nos logs (ex.: "GET /api/v1/admin/members/export").
 */
export function withApiLogging(
  routeName: string,
  handler: (request: NextRequest) => Promise<Response>,
): (request: NextRequest) => Promise<Response> {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      logger.error(`Erro não tratado em ${routeName}`, {
        route: routeName,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: routeName } });
      return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
  };
}
