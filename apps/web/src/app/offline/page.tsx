import Link from 'next/link';
import { Button, WifiOff } from '@vl6/ui';

/**
 * Página de fallback do Service Worker (src/lib/pwa/, public/sw.js) —
 * mostrada quando uma navegação offline não tem versão em cache
 * (docs/architecture/10-roadmap.md v1.3 — "PWA completo, funcionamento
 * offline básico de leitura").
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <WifiOff className="text-muted" size={40} aria-hidden />
      <h1 className="font-display text-2xl font-semibold">Você está offline</h1>
      <p className="text-muted text-sm">
        Esta página ainda não foi visitada com conexão. Páginas que você já abriu continuam
        disponíveis offline — tente voltar para uma delas ou reconectar-se.
      </p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
