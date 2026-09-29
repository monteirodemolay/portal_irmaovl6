import * as Sentry from '@sentry/nextjs';
import { ensureNodePdfDomPolyfills } from '@/lib/pdf/ensure-node-dom-polyfills';

/**
 * Alertas de erro (docs/architecture/10-roadmap.md v1.3, "Sentry ou
 * equivalente") — server + edge runtime. Sem `SENTRY_DSN` configurado, o
 * SDK nunca é inicializado e vira um no-op completo: nada é enviado a
 * lugar nenhum, então isto é seguro de deixar habilitado antes de existir
 * um projeto Sentry real (mesmo raciocínio da configuração do Firebase).
 */
export async function register(): Promise<void> {
  // Só faz sentido no runtime Node.js (não Edge) — é onde `pdf-parse`
  // roda. Import ESTÁTICO (não dinâmico) de propósito: precisa rodar de
  // forma síncrona, sem nenhum `await` antes, pra fechar qualquer corrida
  // de tempo com o pré-carregamento de rota do Next
  // (`unstable_preloadEntries`) — que dispara o `import('pdf-parse')` já
  // ao navegar pra `/admin/pessoas/irmaos/importar`, antes de qualquer
  // upload. Ver `ensureNodePdfDomPolyfills`.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    ensureNodePdfDomPolyfills();
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  // `release` = SHA do commit (mesmo valor de `NEXT_PUBLIC_DEPLOY_SHA`,
  // ver `src/lib/observability/deploy-info.ts`) — associa cada exceção
  // capturada ao deploy exato que a gerou, pra comparar no Sentry qual foi
  // o último release sem esse erro.
  Sentry.init({ dsn, tracesSampleRate: 0.1, release: process.env.VERCEL_GIT_COMMIT_SHA });
}

export const onRequestError = Sentry.captureRequestError;
