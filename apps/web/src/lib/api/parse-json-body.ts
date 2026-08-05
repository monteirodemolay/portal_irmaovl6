import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * `request.json()` lança `SyntaxError` para corpo vazio/malformado — cliente
 * mal-comportado, `navigator.sendBeacon` interrompido no meio do envio,
 * etc. Isso não é um erro interno da rota, então não deve virar 500; as
 * rotas usam isto para tratar como requisição inválida (400) de forma
 * uniforme.
 */
export async function parseJsonBody(request: NextRequest): Promise<unknown> {
  const raw = await request.text();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
