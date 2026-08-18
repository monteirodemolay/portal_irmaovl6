import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';

/** Sempre https em produção — só cai pra http em host local (dev/emulador). */
function resolveOrigin(host: string): string {
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return `${isLocal ? 'http' : 'https'}://${host}`;
}

/**
 * QR aponta pra `/agenda` — o Portal já é um PWA instalável de verdade
 * (`app/manifest.ts` + service worker + fallback `/offline`), então o
 * convite "instale no celular" aqui não é fabricado, é o que já existe.
 */
export async function QuickAccessQrCode() {
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  if (!host) return null;

  const url = `${resolveOrigin(host)}/agenda`;
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: 160,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  return (
    <Card>
      <CardHeader className="space-y-0">
        <CardTitle className="text-base">Acesso rápido no celular</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 text-center">
        <div
          className="border-border h-40 w-40 rounded-lg border p-2"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-muted text-xs">
          Aponte a câmera para abrir a Minha Agenda no celular. O Portal pode ser instalado como
          aplicativo e funciona offline.
        </p>
      </CardContent>
    </Card>
  );
}
