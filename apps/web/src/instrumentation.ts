import * as Sentry from '@sentry/nextjs';

/**
 * Alertas de erro (docs/architecture/10-roadmap.md v1.3, "Sentry ou
 * equivalente") — server + edge runtime. Sem `SENTRY_DSN` configurado, o
 * SDK nunca é inicializado e vira um no-op completo: nada é enviado a
 * lugar nenhum, então isto é seguro de deixar habilitado antes de existir
 * um projeto Sentry real (mesmo raciocínio da configuração do Firebase).
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

export const onRequestError = Sentry.captureRequestError;
