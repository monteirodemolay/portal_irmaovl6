import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { MyAgendaView } from '@/modules/agenda/components/my-agenda-view';
import type { GoogleCalendarEventSummary } from '@/modules/agenda/lib/calendar-item';
import { GoogleConnectionCard } from '@/modules/integrations/components/google-connection-card';

/** Janela carregada de uma vez (filtrada client-side pelas abas) — cobre navegação de mês para trás/frente sem refetch. */
function buildRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
    to: new Date(now.getFullYear(), now.getMonth() + 6, 0),
  };
}

export default async function AgendaPage() {
  const session = await requireSession();
  const container = createServerContainer();
  const { from, to } = buildRange();

  const canReadVl6 = hasPermission(session.authContext, 'event:read');

  const [vl6Events, personalEvents, googleConnection] = await Promise.all([
    canReadVl6
      ? container.useCases.listEventsInRange.execute(session.authContext, { from, to })
      : Promise.resolve([]),
    container.useCases.listMyPersonalEvents.execute(session.authContext, { from, to }),
    container.repositories.googleCalendarConnection.findByUserId(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
  ]);

  // Cache local (nunca chama a Calendar API a cada render) — só populado
  // quando conectado e com a preferência "exibir eventos Google" ligada.
  const googleEvents: GoogleCalendarEventSummary[] =
    googleConnection && googleConnection.preferences.exibirEventosGoogle
      ? (
          await container.repositories.googleCalendarEventCache.listByUser(
            session.authContext.tenantId,
            session.authContext.uid,
          )
        ).map((event) => ({
          id: event.googleEventId,
          titulo: event.titulo,
          inicio: event.inicio,
          fim: event.fim,
          local: event.local,
        }))
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Minha Agenda</h1>
        <p className="text-muted text-sm">Loja, Google e compromissos pessoais em um só lugar.</p>
      </div>

      <GoogleConnectionCard connection={googleConnection} />

      {!canReadVl6 && (
        <EmptyState
          icon={<Lock size={18} strokeWidth={1.75} />}
          title="Eventos da Loja indisponíveis"
          description="Sua função não tem acesso à Agenda institucional. Seus compromissos pessoais continuam abaixo."
          className="border-border rounded-xl border bg-white py-6"
        />
      )}

      <MyAgendaView
        vl6Events={vl6Events}
        personalEvents={personalEvents}
        googleEvents={googleEvents}
      />
    </div>
  );
}
