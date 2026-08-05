import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // Os pacotes do monorepo são consumidos como TypeScript-fonte (não
  // pré-compilados) — ver docs/architecture/02-estrutura-diretorios.md.
  transpilePackages: ['@vl6/ui', '@vl6/domain', '@vl6/infra', '@vl6/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Hardening da API REST (docs/architecture/10-roadmap.md v1.3) — cabeçalhos
  // que não fazem sentido forçar no site/app (ex.: X-Frame-Options quebraria
  // qualquer futuro embed), mas são apropriados para respostas de API pura.
  async headers() {
    return [
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

/**
 * `withSentryConfig` só faz algo em build quando `SENTRY_AUTH_TOKEN`/`org`/
 * `project` estão setados (upload de sourcemaps) — sem eles, o plugin apenas
 * pula essa etapa (docs/architecture/10-roadmap.md v1.3, "alertas de erro").
 * A instrumentação de erro em si (`src/instrumentation*.ts`) não depende
 * disso, só do DSN.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: false,
  webpack: { treeshake: { removeDebugLogging: true } },
});
