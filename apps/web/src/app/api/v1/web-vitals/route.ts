import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@vl6/shared';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { withApiLogging } from '@/lib/api/with-api-logging';

const bodySchema = z.object({
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  id: z.string(),
  navigationType: z.string(),
  path: z.string(),
});

/**
 * Recebe as métricas Core Web Vitals reportadas por
 * `src/lib/observability/web-vitals-reporter.tsx` e as grava como log
 * estruturado — docs/architecture/10-roadmap.md v1.3, "métricas de
 * performance (Web Vitals)". Sem persistência própria: consultar métricas
 * é responsabilidade do agregador de log (Cloud Logging, Vercel, etc.),
 * não deste endpoint.
 */
export const POST = withApiLogging('POST /api/v1/web-vitals', async (request: NextRequest) => {
  const parsed = bodySchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  logger.info('web-vitals', parsed.data);

  return new NextResponse(null, { status: 204 });
});
