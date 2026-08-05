import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { brandingToCssVariables, cssVariablesToStyleString } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { ServiceWorkerRegister } from '@/lib/pwa/service-worker-register';
import { Providers } from './providers';
import './globals.css';

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
  const current = await getCurrentTenant();
  if (!current) {
    notFound();
  }

  const cookieStore = await cookies();
  const themePreference = cookieStore.get('theme')?.value;

  const cssVars = brandingToCssVariables(current.branding);
  const styleString = cssVariablesToStyleString(cssVars);

  return (
    <html
      lang="pt-BR"
      data-theme={
        themePreference === 'dark' || themePreference === 'light' ? themePreference : undefined
      }
      style={{ colorScheme: themePreference === 'dark' ? 'dark' : 'light' }}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${styleString} }` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
