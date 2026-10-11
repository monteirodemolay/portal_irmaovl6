import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero, Upload } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { visibleUploadDestinations } from '@/modules/admin/lib/admin-workspace';

export const metadata = { title: 'Enviar arquivos · Administração VL6' };

/**
 * Porta única de envio. Não recebe arquivo aqui: encaminha para o fluxo que
 * já grava no cadastro de origem (Acervo, Biblioteca ou Documentos), para
 * que nada seja cadastrado em duplicidade. Cada destino mantém sua própria
 * verificação de permissão no servidor.
 */
export default async function EnviarArquivosPage() {
  const session = await requireSession();
  const destinations = visibleUploadDestinations(session.authContext, session.role);
  if (destinations.length === 0) notFound();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHero
        kicker="Administração"
        title="Enviar arquivos"
        description="Escolha a que o arquivo pertence. Ele será gravado no cadastro de origem e aparecerá em todas as telas relacionadas."
      />
      <nav
        aria-label="Onde estes arquivos devem ficar"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {destinations.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className="border-border bg-surface hover:border-primary/40 focus-visible:ring-accent group flex min-h-40 flex-col gap-3 rounded-2xl border p-5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <span className="bg-accent/15 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
              <Upload size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold">{destination.title}</span>
            <span className="text-muted text-sm leading-6">{destination.description}</span>
            <span className="text-muted mt-auto text-xs">Ex.: {destination.examples}</span>
            <span className="text-primary text-sm font-semibold group-hover:underline">
              Continuar →
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
