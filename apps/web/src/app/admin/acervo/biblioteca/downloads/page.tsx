import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
export default async function Page() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [items, users] = await Promise.all([
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.user.listByTenant(session.authContext.tenantId),
  ]);
  const rows = (
    await Promise.all(
      items.map(async (item) =>
        (
          await c.repositories.libraryCirculation.listInteractionsByItem(
            session.authContext.tenantId,
            item.id,
          )
        )
          .filter((i) => i.tipo === 'download')
          .map((i) => ({ i, item })),
      ),
    )
  )
    .flat()
    .sort((a, b) => b.i.occurredAt.getTime() - a.i.occurredAt.getTime());
  const emails = new Map(users.map((u) => [u.id, u.email]));
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-2xl font-semibold">Histórico digital</h1>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/admin/acervo/biblioteca">Voltar</Link>
        </Button>
      </header>
      {!rows.length ? (
        <EmptyState title="Nenhum download registrado" />
      ) : (
        <div className="grid gap-2">
          {rows.map(({ i, item }) => (
            <Card key={i.id}>
              <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:justify-between">
                <span className="min-w-0 break-words">
                  <b>{item.titulo ?? 'Obra'}</b>
                  <br />
                  {emails.get(i.userId) ?? i.userId}
                </span>
                <time className="text-muted shrink-0">{i.occurredAt.toLocaleString('pt-BR')}</time>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
