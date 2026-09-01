import { Image as ImageIcon, Instagram } from '@vl6/ui';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Prévia do link do Portal — gerada 100% a partir de dados já publicados
 * (título/capa), sem nenhuma chamada externa nem armazenamento novo.
 */
export function PortalPreviewCard({
  href,
  titulo,
  coverUrl,
  legenda,
}: {
  href: string;
  titulo: string;
  coverUrl: string | null;
  legenda: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="border-border hover:border-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
      ) : (
        <div className="bg-bg text-muted flex h-14 w-14 shrink-0 items-center justify-center rounded">
          <ImageIcon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{titulo}</p>
        <p className="text-muted truncate text-xs">
          {legenda} · {hostnameOf(href)}
        </p>
      </div>
    </a>
  );
}

/**
 * Prévia estilizada do link do Instagram — sem embed real (oEmbed da Meta
 * exige App Review/token, fora de escopo por ora): um card com ícone e o
 * domínio, visualmente rico o bastante sem depender de credencial externa.
 */
export function InstagramPreviewCard({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="border-border hover:border-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white">
        <Instagram size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">Ver publicação no Instagram</p>
        <p className="text-muted truncate text-xs">{hostnameOf(href)}</p>
      </div>
    </a>
  );
}
