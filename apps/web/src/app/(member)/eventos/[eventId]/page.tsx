import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { BRAZIL_TIME_ZONE, EVENT_KIND_LABELS } from '@vl6/shared';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AttendanceButtons } from '@/modules/agenda/components/attendance-buttons';

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

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.authContext.uid,
  );
  const myAttendance = member
    ? await container.repositories.eventAttendance.findByEventAndMember(eventId, member.id)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{event.titulo}</h1>
        <p className="text-muted">
          {EVENT_KIND_LABELS[event.tipo]} · {event.local}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quando</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {event.dataFim
            ? `${formatDateTime(event.dataInicio)} — ${formatDateTime(event.dataFim)}`
            : `A partir de ${formatDateTime(event.dataInicio)}`}
        </CardContent>
      </Card>

      {event.descricao && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{event.descricao}</CardContent>
        </Card>
      )}

      {event.exigeConfirmacaoPresenca && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmação de presença</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {myAttendance && (
              <Badge variant="outline" className="w-fit">
                Sua resposta atual: {myAttendance.statusPresenca}
              </Badge>
            )}
            <AttendanceButtons
              eventId={eventId}
              currentStatus={myAttendance?.statusPresenca ?? null}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
