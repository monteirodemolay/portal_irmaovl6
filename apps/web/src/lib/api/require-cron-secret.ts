import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Consome o buffer do outro lado com o mesmo custo antes de retornar,
    // pra não vazar o tamanho do segredo por timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Protege rotas `/api/cron/*` disparadas pelo Vercel Cron (sem Cloud
 * Functions — plano Spark). A Vercel injeta automaticamente o header
 * `Authorization: Bearer $CRON_SECRET` nas chamadas de cron quando essa
 * env var está configurada no projeto — ver
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 * Retorna a resposta 401 pronta quando a checagem falha, ou `null` quando
 * pode prosseguir.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 });
  }
  const authorization = request.headers.get('authorization') ?? '';
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}
