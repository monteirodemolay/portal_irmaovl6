import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Os pacotes do monorepo são consumidos como TypeScript-fonte (não
  // pré-compilados) — ver docs/architecture/02-estrutura-diretorios.md.
  transpilePackages: ['@vl6/ui', '@vl6/domain', '@vl6/infra', '@vl6/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
