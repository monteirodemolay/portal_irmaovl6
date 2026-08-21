import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { BRAZIL_TIME_ZONE, EVENT_KIND_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { deleteEventAction } from '@/modules/agenda/actions/agenda-actions';
import { DeleteButton } from '@/components/admin/delete-button';

const STATUS_VARIANT = {
  confirmado: 'success',
  recusado: 'destructive',
  pendente: 'warning',
} as const;
const STATUS_LABEL = {
  confirmado: 'Confirmado',
  recusado: 'Recusou',
  pendente: 'Lista de espera',
} as const;

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(new Date(date));
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await requirePagePermission('event:read');
  const { eventId } = await params;

  const container = createServerContainer();
  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== session.authContext.tenantId) notFound();

  const [attendees, membersPage] = await Promise.all([
    container.useCases.listEventAttendees.execute(session.authContext, eventId),
    container.useCases.searchMembers.execute(session.authContext, {}, { limit: 500 }),
  ]);
  const membersById = new Map(membersPage.items.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{event.titulo}</h1>
          <p className="text-muted">
            {EVENT_KIND_LABELS[event.tipo]} · {event.local}
          </p>
          <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
            {event.dataFim
              ? `${formatDateTime(event.dataInicio)} — ${formatDateTime(event.dataFim)}`
              : formatDateTime(event.dataInicio)}
            {event.dataFim && (
              <Badge variant="outline" className="text-[10px]">
                Início e término definidos
              </Badge>
            )}
          </p>
          {event.descricao && <p className="mt-2 max-w-2xl text-sm">{event.descricao}</p>}
        </div>
        {hasPermission(session.authContext, 'event:update') && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/conteudo/agenda/${eventId}/editar`}>Editar</Link>
            </Button>
            <DeleteButton
              action={deleteEventAction.bind(null, eventId)}
              confirmMessage={`Excluir "${event.titulo}"? Fica registrado em Concluídos.`}
              redirectTo="/admin/conteudo/agenda"
            />
          </div>
        )}
      </div>

      {event.exigeConfirmacaoPresenca && (
        <Card>
          <CardHeader>
            <CardTitle>
              Confirmações de presença
              {event.capacidadeMaxima !== null && (
                <span className="text-muted ml-2 text-sm font-normal">
                  (capacidade: {event.capacidadeMaxima})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
              <EmptyState title="Nenhuma resposta registrada ainda" />
            ) : (
              <ul className="flex flex-col gap-2">
                {attendees.map((attendance) => (
                  <li key={attendance.id} className="flex items-center justify-between text-sm">
                    <span>{membersById.get(attendance.memberId)?.nomeCompleto ?? '—'}</span>
                    <Badge variant={STATUS_VARIANT[attendance.statusPresenca]}>
                      {STATUS_LABEL[attendance.statusPresenca]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
