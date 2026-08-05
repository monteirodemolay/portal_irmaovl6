import * as Sentry from '@sentry/nextjs';

/**
 * Alertas de erro no browser (docs/architecture/10-roadmap.md v1.3) — par
 * client-side de `src/instrumentation.ts`. Precisa de uma DSN pública
 * separada (`NEXT_PUBLIC_*`, exposta ao bundle do cliente); sem ela o SDK
 * não inicializa e este arquivo não faz nada.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
