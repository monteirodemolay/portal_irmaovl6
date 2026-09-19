import Link from 'next/link';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { EmptyState } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { LibraryLabelSheet } from '@/modules/library/components/library-label-sheet';

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return null;
  return `${h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')}://${host}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ libraryItemId?: string; copyId?: string }>;
}) {
  const session = await requirePagePermission('libraryItem:manage');
  const { libraryItemId, copyId } = await searchParams;
  const c = createServerContainer();
  const [base, copies, items, shelves] = await Promise.all([
    origin(),
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const shelfMap = new Map(shelves.map((s) => [s.id, s]));
  let active = copies.filter((x) => x.situacao !== 'baixado');
  if (copyId) active = active.filter((x) => x.id === copyId);
  else if (libraryItemId) active = active.filter((x) => x.libraryItemId === libraryItemId);

  const labels = base
    ? await Promise.all(
        active.map(async (copy) => {
          const item = itemMap.get(copy.libraryItemId);
          const shelf = copy.shelfId ? shelfMap.get(copy.shelfId) : null;
          return {
            copyId: copy.id,
            svg: await QRCode.toString(`${base}/acervo/biblioteca/exemplares/${copy.id}`, {
              type: 'svg',
              width: 96,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#002b55', light: '#ffffff' },
            }),
            titulo: item?.titulo ?? 'Obra',
            codigoTombo: copy.codigoTombo,
            localizacaoLabel: shelf ? `${shelf.codigo} · ${shelf.nome}` : copy.localizacao,
          };
        }),
      )
    : [];

  const focusedItem = libraryItemId ? itemMap.get(libraryItemId) : null;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {focusedItem
              ? `Etiqueta de "${focusedItem.titulo ?? 'Obra'}"`
              : 'Etiquetas QR dos exemplares'}
          </h1>
          <p className="text-muted text-sm">
            {focusedItem
              ? 'Só os exemplares desta obra. Selecione, ajuste a quantidade e imprima.'
              : 'Selecione o que quiser imprimir — tudo, uma obra, um exemplar avulso, ou várias cópias da mesma etiqueta.'}
          </p>
        </div>
        {(focusedItem || copyId) && (
          <Link href="/admin/acervo/biblioteca/etiquetas" className="text-accent text-sm underline">
            Ver todas as etiquetas
          </Link>
        )}
      </header>
      {!base ? (
        <EmptyState title="Endereço público não identificado" />
      ) : !labels.length ? (
        <EmptyState title="Nenhum exemplar para etiquetar" />
      ) : (
        <LibraryLabelSheet labels={labels} />
      )}
    </div>
  );
}
