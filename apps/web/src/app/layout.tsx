import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { brandingToCssVariables, cssVariablesToStyleString } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ServiceWorkerRegister } from '@/lib/pwa/service-worker-register';
import { WebVitalsReporter } from '@/lib/observability/web-vitals-reporter';
import { PATHNAME_HEADER, PLATFORM_ROUTE_PREFIX } from '@/middleware';
import { Providers } from './providers';
import './globals.css';

// As rotas /plataforma (Administrador Geral, docs/architecture/08 §8.3) são
// cross-tenant por definição — nunca dependem do tenant resolvido pelo host.
// O layout raiz não pode 404 nelas nem vestir a marca de uma Loja qualquer
// que porventura responda por esse domínio.
async function isPlatformRoute(): Promise<boolean> {
  const headerList = await headers();
  return (headerList.get(PATHNAME_HEADER) ?? '').startsWith(PLATFORM_ROUTE_PREFIX);
}

export async function generateMetadata(): Promise<Metadata> {
  const current = await getCurrentTenant();
  const branding = current?.branding;

  return {
    title: current ? current.tenant.nome : 'Portal do Irmão',
    description: current
      ? `Portal oficial da ${current.tenant.nome}`
      : 'Plataforma multi-tenant para Lojas Maçônicas.',
    manifest: '/manifest.webmanifest',
    icons: branding?.faviconUrl
      ? { icon: branding.faviconUrl, apple: branding.faviconUrl }
      : {
          icon: [
            { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          ],
          apple: { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
        },
    appleWebApp: {
      title: current ? current.tenant.nome : 'Portal do Irmão',
      statusBarStyle: 'default',
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const current = await getCurrentTenant();
  return {
    themeColor: current?.branding.corPrimaria ?? '#061C36',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isPlatform = await isPlatformRoute();
  const current = await getCurrentTenant();
  if (!current && !isPlatform) {
    notFound();
  }

  const cookieStore = await cookies();
  const themePreference = cookieStore.get('theme')?.value;

  // Sem tenant (rota /plataforma), fica nos tokens padrão de globals.css —
  // o Administrador Geral não veste a marca de nenhuma Loja específica.
  const styleString = current
    ? cssVariablesToStyleString(brandingToCssVariables(current.branding))
    : '';
  const locale = current?.locale ?? DEFAULT_LOCALE;
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      data-theme={
        themePreference === 'dark' || themePreference === 'light' ? themePreference : undefined
      }
      style={{ colorScheme: themePreference === 'dark' ? 'dark' : 'light' }}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${styleString} }` }} />
      </head>
      <body>
        <Providers dictionary={dictionary}>{children}</Providers>
        <ServiceWorkerRegister />
        <WebVitalsReporter />
      </body>
    </html>
  );
}
