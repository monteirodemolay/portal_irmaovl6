import { headers } from 'next/headers';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PrintLibraryLabelsButton } from '@/modules/library/components/print-library-labels-button';
async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return null;
  return `${h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')}://${host}`;
}
export default async function Page() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [base, copies, items, shelves] = await Promise.all([
    origin(),
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const shelfMap = new Map(shelves.map((s) => [s.id, s]));
  const active = copies.filter((x) => x.situacao !== 'baixado');
  const labels = base
    ? await Promise.all(
        active.map(async (copy) => ({
          copy,
          svg: await QRCode.toString(`${base}/acervo/biblioteca/exemplares/${copy.id}`, {
            type: 'svg',
            width: 96,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#002b55', light: '#ffffff' },
          }),
        })),
      )
    : [];
  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold">Etiquetas QR dos exemplares</h1>
          <p className="text-muted text-sm">Identificação individual e localização atual.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca">Voltar</Link>
          </Button>
          {labels.length > 0 && <PrintLibraryLabelsButton />}
        </div>
      </header>
      {!base ? (
        <EmptyState title="Endereço público não identificado" />
      ) : !labels.length ? (
        <EmptyState title="Nenhum exemplar para etiquetar" />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-2">
          {labels.map(({ copy, svg }) => {
            const item = itemMap.get(copy.libraryItemId);
            const shelf = copy.shelfId ? shelfMap.get(copy.shelfId) : null;
            return (
              <Card
                key={copy.id}
                className="break-inside-avoid overflow-hidden print:rounded-md print:shadow-none"
              >
                <CardContent className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] items-center gap-3 p-3 text-left print:gap-2 print:p-2">
                  <div
                    className="h-24 w-24 shrink-0 overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <div className="min-w-0 border-l pl-3 print:pl-2">
                    <p className="text-primary text-[9px] font-semibold uppercase tracking-[0.12em]">
                      Biblioteca VL6
                    </p>
                    <h2 className="mt-1 line-clamp-2 break-words text-xs font-semibold leading-tight">
                      {item?.titulo ?? 'Obra'}
                    </h2>
                    <p className="mt-2 truncate font-mono text-[10px] font-bold">
                      {copy.codigoTombo}
                    </p>
                    <p className="text-muted mt-0.5 truncate text-[9px]">
                      {shelf ? `${shelf.codigo} · ${shelf.nome}` : copy.localizacao}
                    </p>
                    <Badge variant="outline" className="mt-1 h-4 px-1.5 text-[8px] print:hidden">
                      {copy.estadoGeral}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
