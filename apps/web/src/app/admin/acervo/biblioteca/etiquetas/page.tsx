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
            width: 160,
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
        <div className="flex gap-2">
          <Button asChild variant="outline">
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
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
          {labels.map(({ copy, svg }) => {
            const item = itemMap.get(copy.libraryItemId);
            const shelf = copy.shelfId ? shelfMap.get(copy.shelfId) : null;
            return (
              <Card key={copy.id} className="break-inside-avoid print:shadow-none">
                <CardContent className="grid grid-cols-[128px_1fr] items-center gap-3 p-3">
                  <div className="h-32 w-32" dangerouslySetInnerHTML={{ __html: svg }} />
                  <div className="grid gap-1">
                    <p className="text-muted text-[10px] uppercase">Biblioteca VL6</p>
                    <h2 className="text-sm font-semibold">{item?.titulo ?? 'Obra'}</h2>
                    <p className="text-xs">
                      <b>Tombo:</b> {copy.codigoTombo}
                    </p>
                    <p className="text-xs">
                      <b>Estante:</b> {shelf ? `${shelf.codigo} · ${shelf.nome}` : copy.localizacao}
                    </p>
                    <Badge variant="outline" className="w-fit print:hidden">
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
