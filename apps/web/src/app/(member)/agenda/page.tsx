import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(date),
  );
}

export default async function AgendaPage() {
  const session = await requirePagePermission('event:read');

  const container = createServerContainer();
  const page = await container.useCases.listUpcomingEvents.execute(session.authContext, {
    limit: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Agenda</h1>

      {page.items.length === 0 ? (
        <EmptyState title="Nenhum evento programado" />
      ) : (
        <div className="flex flex-col gap-3">
          {page.items.map((event) => (
            <Link key={event.id} href={`/eventos/${event.id}`}>
              <Card className="hover:border-accent transition-colors">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle>{event.titulo}</CardTitle>
                  <Badge variant="outline">{EVENT_KIND_LABELS[event.tipo]}</Badge>
                </CardHeader>
                <CardContent className="text-muted flex flex-col gap-1 text-sm">
                  <span>{formatDateTime(event.dataInicio)}</span>
                  <span>{event.local}</span>
                  {event.exigeConfirmacaoPresenca && (
                    <Badge variant="accent" className="w-fit">
                      Exige confirmação
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
