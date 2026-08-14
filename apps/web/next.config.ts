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
  // Reorganização da IA administrativa (docs/architecture) — cada rota antiga
  // do admin virou uma aba dentro de uma das 5 áreas consolidadas
  // (`/admin/pessoas`, `/admin/conteudo`, `/admin/acervo`,
  // `/admin/configuracoes`). `permanent: false` (307) enquanto a nova
  // estrutura estabiliza — promover pra 308 depois (ver plano).
  async redirects() {
    return [
      { source: '/admin/arquivos', destination: '/admin/acervo/arquivos', permanent: false },
      {
        source: '/admin/arquivos/novo',
        destination: '/admin/acervo/arquivos/novo',
        permanent: false,
      },
      { source: '/admin/biblioteca', destination: '/admin/acervo/biblioteca', permanent: false },
      {
        source: '/admin/biblioteca/novo',
        destination: '/admin/acervo/biblioteca/novo',
        permanent: false,
      },
      { source: '/admin/galeria', destination: '/admin/acervo/galeria', permanent: false },
      {
        source: '/admin/galeria/novo',
        destination: '/admin/acervo/galeria/novo',
        permanent: false,
      },
      {
        source: '/admin/galeria/:albumId',
        destination: '/admin/acervo/galeria/:albumId',
        permanent: false,
      },
      { source: '/admin/avisos', destination: '/admin/conteudo/avisos', permanent: false },
      {
        source: '/admin/avisos/novo',
        destination: '/admin/conteudo/avisos/novo',
        permanent: false,
      },
      { source: '/admin/noticias', destination: '/admin/conteudo/noticias', permanent: false },
      {
        source: '/admin/noticias/nova',
        destination: '/admin/conteudo/noticias/nova',
        permanent: false,
      },
      {
        source: '/admin/noticias/:newsId',
        destination: '/admin/conteudo/noticias/:newsId',
        permanent: false,
      },
      { source: '/admin/agenda', destination: '/admin/conteudo/agenda', permanent: false },
      {
        source: '/admin/agenda/novo',
        destination: '/admin/conteudo/agenda/novo',
        permanent: false,
      },
      {
        source: '/admin/agenda/:eventId',
        destination: '/admin/conteudo/agenda/:eventId',
        permanent: false,
      },
      { source: '/admin/irmaos', destination: '/admin/pessoas/irmaos', permanent: false },
      {
        source: '/admin/irmaos/novo',
        destination: '/admin/pessoas/irmaos/novo',
        permanent: false,
      },
      {
        source: '/admin/irmaos/:memberId',
        destination: '/admin/pessoas/irmaos/:memberId',
        permanent: false,
      },
      { source: '/admin/usuarios', destination: '/admin/pessoas/usuarios', permanent: false },
      { source: '/admin/gestoes', destination: '/admin/pessoas/gestoes', permanent: false },
      {
        source: '/admin/gestoes/nova',
        destination: '/admin/pessoas/gestoes/nova',
        permanent: false,
      },
      {
        source: '/admin/gestoes/:termId',
        destination: '/admin/pessoas/gestoes/:termId',
        permanent: false,
      },
      { source: '/admin/permissoes', destination: '/admin/pessoas/permissoes', permanent: false },
      { source: '/admin/loja', destination: '/admin/pessoas/loja', permanent: false },
      {
        source: '/admin/integracoes',
        destination: '/admin/configuracoes/integracoes',
        permanent: false,
      },
      {
        source: '/admin/configuracoes',
        destination: '/admin/configuracoes/geral',
        permanent: false,
      },
      // Módulo "Irmãos" — unifica "Meu Perfil" (`/perfil`) e "Central VL6"
      // (`/central`) num único item de menu com abas Diretório/Meu Espaço.
      { source: '/perfil', destination: '/irmaos/meu-espaco', permanent: false },
      { source: '/central', destination: '/irmaos', permanent: false },
      { source: '/central/:memberId', destination: '/irmaos/:memberId', permanent: false },
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
