import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { errorToLogContext, logger } from '@vl6/shared';

/**
 * Envolve um handler de rota `/api/v1/**` (docs/architecture/10-roadmap.md
 * v1.3, "logging estruturado") — nenhuma rota tinha try/catch antes disso,
 * então uma exceção não tratada (erro do Firestore, timeout, etc.) virava
 * um 500 genérico do Next sem nenhum registro estruturado do que aconteceu.
 * `routeName` identifica a rota nos logs (ex.: "GET /api/v1/admin/members/export").
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
      return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
  };
}
