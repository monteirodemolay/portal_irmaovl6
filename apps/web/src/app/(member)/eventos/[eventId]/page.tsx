import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { Badge, CalendarDays, Card, Clock, MapPin } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AttendanceButtons } from '@/modules/agenda/components/attendance-buttons';
import { formatEventDate } from '@/modules/dashboard/lib/format-event-date';

/**
 * Ficha de um Evento — rota antiga, hoje só alcançada por links que
 * apontam pro `id` diretamente (ex.: Constelação da Memória), já que os
 * pontos de entrada normais do Portal abrem a gaveta da Agenda
 * (`AgendaOpenButton`) em vez de navegar pra cá. Restilizada no mesmo
 * padrão visual do cartão "Próximo evento" do Início (`NextEventCard`) —
 * antes usava `Card`s genéricos "Quando"/"Descrição" bem mais simples que
 * o resto do Portal.
 */
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

  const { day, month, weekday, timeRange } = formatEventDate(event.dataInicio, event.dataFim);

  return (
    <div className="flex flex-col gap-6">
      <Card className="from-primary to-primary-dark relative flex flex-col gap-4 overflow-hidden bg-gradient-to-br p-6 text-white shadow-sm">
        <CalendarDays
          size={140}
          strokeWidth={1}
          className="text-accent/10 pointer-events-none absolute -right-8 -top-8"
        />

        <div className="relative flex items-start gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-white/10 py-3 ring-1 ring-white/15">
            <span className="text-2xl font-bold leading-none">{day}</span>
            <span className="text-accent mt-1 text-[11px] font-semibold uppercase leading-none">
              {month}
            </span>
          </div>
          <div className="min-w-0 pt-1">
            <Badge variant="accent" className="bg-accent text-primary-dark">
              {EVENT_KIND_LABELS[event.tipo]}
            </Badge>
            <p className="font-display mt-1.5 text-xl font-semibold">{event.titulo}</p>
          </div>
        </div>

        <div className="relative flex flex-col gap-1.5 text-sm text-white/70">
          <p className="flex items-center gap-1.5">
            <Clock size={14} /> {weekday}, {timeRange}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin size={14} /> {event.local}
          </p>
        </div>

        {event.descricao && (
          <p className="relative whitespace-pre-line text-sm text-white/80">{event.descricao}</p>
        )}
      </Card>

      {event.exigeConfirmacaoPresenca && (
        <Card className="flex flex-col gap-3 p-5 shadow-none">
          <p className="font-display text-sm font-semibold">Confirmação de presença</p>
          {myAttendance && (
            <Badge variant="outline" className="w-fit">
              Sua resposta atual: {myAttendance.statusPresenca}
            </Badge>
          )}
          <AttendanceButtons
            eventId={eventId}
            currentStatus={myAttendance?.statusPresenca ?? null}
          />
        </Card>
      )}
    </div>
  );
}
