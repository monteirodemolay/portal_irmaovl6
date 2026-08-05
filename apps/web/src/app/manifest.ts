import type { MetadataRoute } from 'next';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

/**
 * Manifest PWA dinâmico por tenant (docs/architecture/10-roadmap.md v1.3 —
 * "PWA completo"). Nome e cores vêm do `TenantBranding` da Loja atual; se o
 * tenant ainda não subiu logotipo próprio, cai nos ícones estáticos padrão
 * em `public/icons/`.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const current = await getCurrentTenant();
  const nome = current?.tenant.nome ?? 'Portal do Irmão';
  const branding = current?.branding;

  const icons: MetadataRoute.Manifest['icons'] = branding?.logotipoUrl
    ? [{ src: branding.logotipoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' }]
    : [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ];

  return {
    name: nome,
    short_name: nome.length > 30 ? nome.split(' ')[0] : nome,
    description: `Portal oficial da ${nome}`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'pt-BR',
    background_color: branding?.corFundo ?? '#F5F7FA',
    theme_color: branding?.corPrimaria ?? '#061C36',
    icons,
  };
}
