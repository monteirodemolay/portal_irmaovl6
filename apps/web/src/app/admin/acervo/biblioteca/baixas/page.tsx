import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent, Input, Select, Textarea } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { BaixasTabs } from '@/modules/library/components/baixas-tabs';
import { createLibraryWriteOffAction } from '@/modules/library/actions/library-actions';

export default async function Page() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [copies, items, occurrences] = await Promise.all([
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listOccurrencesByTenant(session.authContext.tenantId),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const pendingCount = occurrences.filter((o) =>
    ['relatado', 'em_analise'].includes(o.statusOcorrencia),
  ).length;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Ocorrências e baixa de livros</h1>
        <p className="text-muted text-sm">
          Perda, roubo, extravio ou dano irrecuperável, sempre com atesto.
        </p>
      </header>
      <BaixasTabs active="registrar" pendingCount={pendingCount} />
      <Card>
        <CardContent className="p-5">
          <form
            action={async (fd) => {
              'use server';
              await createLibraryWriteOffAction({ error: null }, fd);
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <Select name="copyId" required defaultValue="">
              <option value="" disabled>
                Exemplar…
              </option>
              {copies
                .filter((x) => x.situacao !== 'baixado')
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codigoTombo} · {itemMap.get(x.libraryItemId)?.titulo}
                  </option>
                ))}
            </Select>
            <Select name="motivo" defaultValue="perda">
              <option value="perda">Perda</option>
              <option value="roubo">Roubo</option>
              <option value="extravio">Extravio</option>
              <option value="dano_irrecuperavel">Dano irrecuperável</option>
              <option value="outro">Outro</option>
            </Select>
            <Input type="date" name="occurredAt" required />
            <Textarea
              name="relato"
              minLength={20}
              required
              placeholder="Relato e atesto do Bibliotecário"
            />
            <Button className="w-full md:w-fit" variant="destructive">
              Registrar baixa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
