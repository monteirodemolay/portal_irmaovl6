import * as Sentry from '@sentry/nextjs';

/**
 * Alertas de erro no browser (docs/architecture/10-roadmap.md v1.3) — par
 * client-side de `src/instrumentation.ts`. Precisa de uma DSN pública
 * separada (`NEXT_PUBLIC_*`, exposta ao bundle do cliente); sem ela o SDK
 * não inicializa e este arquivo não faz nada.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  // Mesmo SHA usado no `release` do lado servidor (`instrumentation.ts`) e
  // no upload de sourcemap (`next.config.ts`) — necessário pro Sentry
  // juntar os dois lados do mesmo erro sob o mesmo release.
  Sentry.init({ dsn, tracesSampleRate: 0.1, release: process.env.NEXT_PUBLIC_DEPLOY_SHA || undefined });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
