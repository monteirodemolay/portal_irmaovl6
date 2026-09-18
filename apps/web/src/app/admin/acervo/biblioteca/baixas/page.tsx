import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent, EmptyState, Input, Select, Textarea } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  attestLibraryOccurrenceAction,
  createLibraryWriteOffAction,
} from '@/modules/library/actions/library-actions';
export default async function Page() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [copies, items, occurrences] = await Promise.all([
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listOccurrencesByTenant(session.authContext.tenantId),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Ocorrências e baixa de livros</h1>
          <p className="text-muted text-sm">
            Perda, roubo, extravio ou dano irrecuperável, sempre com atesto.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/admin/acervo/biblioteca">Voltar</Link>
        </Button>
      </header>
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
      {!occurrences.length ? (
        <EmptyState title="Nenhuma ocorrência" />
      ) : (
        <div className="grid gap-3">
          {occurrences.map((o) => (
            <Card key={o.id}>
              <CardContent className="grid gap-2 p-4">
                <b>
                  {itemMap.get(o.libraryItemId)?.titulo ?? 'Obra'} · {o.motivo}
                </b>
                <p className="text-sm">{o.relato}</p>
                <p className="text-muted text-xs">Situação: {o.statusOcorrencia}</p>
                {['relatado', 'em_analise'].includes(o.statusOcorrencia) && (
                  <form
                    action={attestLibraryOccurrenceAction}
                    className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <input type="hidden" name="occurrenceId" value={o.id} />
                    <Textarea
                      name="librarianAttestation"
                      required
                      minLength={10}
                      placeholder="Atesto do Bibliotecário"
                    />
                    <Button
                      name="decision"
                      value="confirmado"
                      variant="destructive"
                      className="w-full sm:w-auto"
                    >
                      Confirmar baixa
                    </Button>
                    <Button
                      name="decision"
                      value="rejeitado"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Rejeitar relato
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
