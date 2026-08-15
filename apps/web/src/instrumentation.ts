import * as Sentry from '@sentry/nextjs';

/**
 * Alertas de erro (docs/architecture/10-roadmap.md v1.3, "Sentry ou
 * equivalente") — server + edge runtime. Sem `SENTRY_DSN` configurado, o
 * SDK nunca é inicializado e vira um no-op completo: nada é enviado a
 * lugar nenhum, então isto é seguro de deixar habilitado antes de existir
 * um projeto Sentry real (mesmo raciocínio da configuração do Firebase).
 */
export async function register(): Promise<void> {
  // Só faz sentido no runtime Node.js (não Edge) — é onde `pdf-parse`
  // roda. Precisa acontecer aqui, na inicialização do servidor, e não
  // dentro da Server Action que usa `pdf-parse`: o Next pré-carrega o
  // módulo da rota de importação assim que ela é navegada, antes de
  // qualquer upload — ver `ensureNodePdfDomPolyfills`.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureNodePdfDomPolyfills } = await import('@/lib/pdf/ensure-node-dom-polyfills');
    ensureNodePdfDomPolyfills();
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

export const onRequestError = Sentry.captureRequestError;
