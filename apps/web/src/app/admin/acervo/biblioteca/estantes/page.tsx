import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent, EmptyState, Input, Select, Textarea } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { CreateLibraryShelfForm } from '@/modules/library/components/create-library-shelf-form';
import {
  deactivateLibraryShelfAction,
  updateLibraryShelfAction,
} from '@/modules/library/actions/library-actions';
export default async function Page() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [shelves, copies] = await Promise.all([
    c.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
  ]);
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Estantes do acervo</h1>
        <p className="text-muted text-sm">Localização padronizada dos exemplares.</p>
      </header>
      <CreateLibraryShelfForm />
      {!shelves.length ? (
        <EmptyState title="Nenhuma estante cadastrada" />
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {shelves.map((s) => {
            const count = copies.filter((x) => x.shelfId === s.id).length;
            return (
              <Card key={s.id}>
                <CardContent className="grid gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted text-xs uppercase">{s.codigo}</p>
                      <h2 className="font-semibold">{s.nome}</h2>
                    </div>
                    <Badge variant="outline">{count} exemplar(es)</Badge>
                  </div>
                  <p className="text-muted text-sm">{s.descricao}</p>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">
                      Editar ou desativar
                    </summary>
                    <div className="mt-3 grid gap-4">
                      <form
                        action={updateLibraryShelfAction.bind(null, s.id)}
                        className="grid gap-2"
                      >
                        <Input name="codigo" defaultValue={s.codigo} />
                        <Input name="nome" defaultValue={s.nome} />
                        <Textarea name="descricao" defaultValue={s.descricao ?? ''} />
                        <Button size="sm" className="w-full sm:w-fit">
                          Salvar e atualizar exemplares
                        </Button>
                      </form>
                      <form
                        action={deactivateLibraryShelfAction.bind(null, s.id)}
                        className="grid gap-2 rounded border border-red-200 p-3"
                      >
                        <Select name="targetShelfId" required defaultValue="">
                          <option value="" disabled>
                            Transferir para…
                          </option>
                          {shelves
                            .filter((x) => x.id !== s.id)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.codigo} · {x.nome}
                              </option>
                            ))}
                        </Select>
                        <Button size="sm" variant="destructive" disabled={shelves.length < 2}>
                          Transferir e desativar
                        </Button>
                      </form>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
