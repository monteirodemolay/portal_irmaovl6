import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@vl6/shared';
import { getClientIp } from '@/lib/api/get-client-ip';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { webVitalsBodySchema } from './schema';

// Generoso o bastante pra uma sessão real (até 5 métricas por página ×
// várias navegações) sem abrir margem pra inundar os logs.
const webVitalsRateLimiter = new RateLimiter();

/**
 * Recebe as métricas Core Web Vitals reportadas por
 * `src/lib/observability/web-vitals-reporter.tsx` e as grava como log
 * estruturado — docs/architecture/10-roadmap.md v1.3, "métricas de
 * performance (Web Vitals)". Sem persistência própria: consultar métricas
 * é responsabilidade do agregador de log (Cloud Logging, Vercel, etc.),
 * não deste endpoint.
 */
export const POST = withApiLogging('POST /api/v1/web-vitals', async (request: NextRequest) => {
  const ip = getClientIp(request);
  const limit = webVitalsRateLimiter.check(ip, { limit: 120, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return rateLimitResponse(limit);
  }

  const parsed = webVitalsBodySchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  logger.info('web-vitals', parsed.data);

  return new NextResponse(null, { status: 204 });
});
