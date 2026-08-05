import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

const PRIORITY_VARIANT = { baixa: 'default', media: 'warning', alta: 'destructive' } as const;

export default async function MemberAnnouncementsPage() {
  const session = await requirePagePermission('announcement:read');

  const container = createServerContainer();
  const announcements = await container.useCases.listActiveAnnouncements.execute(
    session.authContext.tenantId,
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Avisos</h1>
      {announcements.length === 0 ? (
        <EmptyState title="Nenhum aviso no momento" />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Card key={a.id} className={a.destacar ? 'border-accent' : undefined}>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle>{a.titulo}</CardTitle>
                <Badge variant={PRIORITY_VARIANT[a.prioridade]}>{a.prioridade}</Badge>
              </CardHeader>
              <CardContent className="text-muted text-sm">{a.descricao}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
