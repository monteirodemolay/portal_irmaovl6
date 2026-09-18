import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, EmptyState } from '@vl6/ui';
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

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCountByItem = new Map<string, number>();
  for (const { i, item } of rows) {
    if (i.occurredAt.getTime() < thirtyDaysAgo) continue;
    recentCountByItem.set(item.id, (recentCountByItem.get(item.id) ?? 0) + 1);
  }
  const topEntry = [...recentCountByItem.entries()].sort((a, b) => b[1] - a[1])[0];
  const topItem = topEntry ? items.find((item) => item.id === topEntry[0]) : null;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Histórico digital</h1>
        <p className="text-muted text-sm">
          {topItem
            ? `Mais baixada nos últimos 30 dias: "${topItem.titulo ?? 'Obra'}" (${topEntry![1]} downloads).`
            : 'Nenhum download nos últimos 30 dias.'}
        </p>
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
