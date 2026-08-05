import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * App Router não expõe mais `request.ip` (extensão específica da Vercel,
 * removida no Next 15) — o IP do cliente vem do header que o proxy/load
 * balancer na frente da aplicação propaga. `x-forwarded-for` pode conter
 * uma cadeia "cliente, proxy1, proxy2"; o primeiro item é o IP original.
 * Sem nenhum proxy conhecido na frente (dev local), cai num valor fixo —
 * suficiente pra não quebrar o rate limiter, só significa que todo tráfego
 * local compartilha o mesmo balde.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]!.trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
