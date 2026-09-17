import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function LibraryCopyQrPage({
  params,
}: {
  params: Promise<{ copyId: string }>;
}) {
  const session = await requirePagePermission('libraryItem:read');
  const { copyId } = await params;
  const container = createServerContainer();
  const copy = await container.repositories.libraryCirculation.findCopyById(copyId);
  if (!copy || copy.tenantId !== session.authContext.tenantId || copy.deletedAt) notFound();
  const [item, shelf] = await Promise.all([
    container.repositories.libraryItem.findById(copy.libraryItemId),
    copy.shelfId ? container.repositories.libraryCirculation.findShelfById(copy.shelfId) : null,
  ]);
  if (!item || item.tenantId !== session.authContext.tenantId) notFound();

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <header>
        <p className="text-accent text-sm font-semibold uppercase tracking-widest">
          Exemplar identificado
        </p>
        <h1 className="font-display text-3xl font-semibold">{item.titulo}</h1>
        <p className="text-muted">{item.autor ?? 'Autoria não informada'}</p>
      </header>
      <Card>
        <CardContent className="grid gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            <Badge>Tombo {copy.codigoTombo}</Badge>
            <Badge variant={copy.situacao === 'disponivel' ? 'success' : 'warning'}>
              {copy.situacao}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Data label="Estado geral" value={copy.estadoGeral} />
            <Data
              label="Localização"
              value={shelf ? `${shelf.codigo} · ${shelf.nome}` : copy.localizacao}
            />
            <Data label="Classificação" value={item.codigoClassificacao} />
            <Data label="Formato" value={item.formato} />
          </dl>
          {copy.observacoes && <p className="text-muted text-sm">Observação: {copy.observacoes}</p>}
          <Button asChild className="w-fit">
            <Link href={`/acervo/biblioteca/${item.id}`}>Abrir ficha completa</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Data({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="font-medium">{value || 'Não informado'}</dd>
    </div>
  );
}
