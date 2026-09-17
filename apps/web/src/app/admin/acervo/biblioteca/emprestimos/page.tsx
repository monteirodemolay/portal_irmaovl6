import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  extendLibraryLoanPickupAction,
  sendLibraryLoanReminderAction,
  updateLibraryLoanStatusAction,
} from '@/modules/library/actions/library-actions';
export default async function Page() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [loans, items, copies, shelves] = await Promise.all([
    c.repositories.libraryCirculation.listLoansByTenant(session.authContext.tenantId),
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const copyMap = new Map(copies.map((i) => [i.id, i]));
  return (
    <div className="grid gap-6">
      <header className="flex justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Gestão de empréstimos</h1>
          <p className="text-muted text-sm">Aprovação, retirada, prazo, devolução e cobrança.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/acervo/biblioteca">Voltar</Link>
        </Button>
      </header>
      {!loans.length ? (
        <EmptyState title="Nenhum empréstimo" />
      ) : (
        <div className="grid gap-4">
          {loans.map((l) => {
            const item = itemMap.get(l.libraryItemId);
            const copy = copyMap.get(l.copyId);
            const overdue =
              ['retirado', 'atrasado'].includes(l.statusEmprestimo) &&
              l.dueAt.getTime() < Date.now();
            const maxDue = new Date(l.requestedPickupAt);
            maxDue.setDate(maxDue.getDate() + 180);
            const maxPickup = new Date(l.requestedPickupAt);
            maxPickup.setDate(maxPickup.getDate() + 30);
            const maxExtended = new Date(l.requestedPickupAt);
            maxExtended.setDate(maxExtended.getDate() + 60);
            return (
              <Card key={l.id} className={overdue ? 'border-red-300' : undefined}>
                <CardContent className="grid gap-4 p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{item?.titulo ?? 'Obra'}</h2>
                      <p className="text-sm">
                        {l.borrowerName} · Tombo {copy?.codigoTombo}
                      </p>
                      <p className="text-muted text-xs">
                        Pacote #{(l.requestPackageId ?? l.id).slice(-8).toUpperCase()} · retirada{' '}
                        {l.requestedPickupAt.toLocaleDateString('pt-BR')} · devolução{' '}
                        {l.dueAtConfirmed ? l.dueAt.toLocaleDateString('pt-BR') : 'a definir'}
                      </p>
                      {l.pickupDeadlineAt && l.statusEmprestimo === 'aprovado' && (
                        <p className="text-sm text-amber-800">
                          Retirar até {l.pickupDeadlineAt.toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        overdue
                          ? 'destructive'
                          : l.statusEmprestimo === 'devolvido'
                            ? 'success'
                            : 'outline'
                      }
                    >
                      {overdue ? 'atrasado' : l.statusEmprestimo}
                    </Badge>
                  </div>
                  {l.statusEmprestimo === 'solicitado' && (
                    <div className="grid gap-2">
                      <form
                        action={updateLibraryLoanStatusAction.bind(null, l.id, 'aprovado')}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <label className="grid text-xs">
                          Retirar até
                          <input
                            className="h-8 rounded border px-2"
                            name="pickupDeadlineAt"
                            type="date"
                            min={l.requestedPickupAt.toISOString().slice(0, 10)}
                            max={maxPickup.toISOString().slice(0, 10)}
                            defaultValue={l.requestedPickupAt.toISOString().slice(0, 10)}
                          />
                        </label>
                        <label className="grid text-xs">
                          Devolver até
                          <input
                            className="h-8 rounded border px-2"
                            name="dueAt"
                            type="date"
                            min={l.requestedPickupAt.toISOString().slice(0, 10)}
                            max={maxDue.toISOString().slice(0, 10)}
                            defaultValue={l.dueAt.toISOString().slice(0, 10)}
                          />
                        </label>
                        <Button size="sm">Aprovar</Button>
                      </form>
                      <form
                        action={updateLibraryLoanStatusAction.bind(null, l.id, 'recusado')}
                        className="flex gap-2"
                      >
                        <input
                          className="h-8 rounded border px-2"
                          name="reason"
                          placeholder="Motivo da recusa"
                          minLength={5}
                          required
                        />
                        <Button size="sm" variant="outline">
                          Recusar
                        </Button>
                      </form>
                    </div>
                  )}
                  {l.statusEmprestimo === 'aprovado' && (
                    <div className="grid gap-2">
                      <form action={updateLibraryLoanStatusAction.bind(null, l.id, 'retirado')}>
                        <Button size="sm">Confirmar retirada</Button>
                      </form>
                      <form
                        action={extendLibraryLoanPickupAction.bind(null, l.id)}
                        className="flex flex-wrap gap-2"
                      >
                        <input
                          className="h-8 rounded border px-2"
                          type="date"
                          name="pickupDeadlineAt"
                          max={maxExtended.toISOString().slice(0, 10)}
                          required
                        />
                        <input
                          className="h-8 rounded border px-2"
                          name="reason"
                          placeholder="Motivo"
                          minLength={5}
                          required
                        />
                        <Button size="sm" variant="outline">
                          Prorrogar
                        </Button>
                      </form>
                      <form
                        action={updateLibraryLoanStatusAction.bind(null, l.id, 'cancelado')}
                        className="flex gap-2"
                      >
                        <input
                          className="h-8 rounded border px-2"
                          name="reason"
                          placeholder="Não retirado: motivo"
                          minLength={5}
                          required
                        />
                        <Button size="sm" variant="destructive">
                          Liberar exemplar
                        </Button>
                      </form>
                    </div>
                  )}
                  {['retirado', 'atrasado'].includes(l.statusEmprestimo) && (
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={updateLibraryLoanStatusAction.bind(null, l.id, 'devolvido')}
                        className="flex gap-2"
                      >
                        <select
                          className="h-8 rounded border px-2"
                          name="shelfId"
                          defaultValue={copy?.shelfId ?? ''}
                        >
                          {shelves.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.codigo} · {s.nome}
                            </option>
                          ))}
                        </select>
                        <Button size="sm">Confirmar devolução</Button>
                      </form>
                      <form action={sendLibraryLoanReminderAction.bind(null, l.id)}>
                        <Button size="sm" variant="outline">
                          Avisar no Portal
                        </Button>
                      </form>
                      {l.borrowerEmail && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`mailto:${l.borrowerEmail}`}>E-mail</a>
                        </Button>
                      )}
                      {l.borrowerWhatsapp && (
                        <Button asChild size="sm" variant="outline">
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href={`https://wa.me/55${l.borrowerWhatsapp.replace(/\D/g, '')}`}
                          >
                            WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
