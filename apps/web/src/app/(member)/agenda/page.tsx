import * as Sentry from '@sentry/nextjs';
import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { EmptyState, Lock, PageHero } from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { AgendaSidebar } from '@/modules/agenda/components/agenda-sidebar';
import { MyAgendaView } from '@/modules/agenda/components/my-agenda-view';
import type {
  AgendaAnniversarySummary,
  GoogleCalendarEventSummary,
} from '@/modules/agenda/lib/calendar-item';

const ROUTE = '/agenda';

/**
 * A Agenda trabalha com o ano civil fechado. De janeiro a novembro, carrega
 * somente o ano vigente; em dezembro acrescenta janeiro do ano seguinte para
 * que a virada do calendário já apareça sem abrir todo o próximo exercício.
 */
function buildRange(): { from: Date; to: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const isDecember = now.getMonth() === 11;
  return {
    from: new Date(year, 0, 1, 0, 0, 0, 0),
    to: isDecember
      ? new Date(year + 1, 0, 31, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/**
 * Isola cada origem (VL6/pessoal/Google) — se uma consulta falhar (ex.:
 * índice do Firestore ainda não publicado em produção), as outras origens
 * continuam funcionando em vez de derrubar a página inteira no boundary
 * global de erro.
 */
async function safeFetch<T>(resource: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Falha ao carregar "${resource}" na Minha Agenda`, {
      route: ROUTE,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: ROUTE, resource } });
    return fallback;
  }
}

export default async function AgendaPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  if (!current) return null;
  const container = createServerContainer();
  const { from, to } = buildRange();

  const canReadVl6 = hasPermission(session.authContext, 'event:read');
  const canReadMembers = hasPermission(session.authContext, 'member:read');
  const canManageHeroPhoto = hasPermission(session.authContext, 'tenant:manage');
  const heroPhoto = resolveHeroPhoto(current.tenant, 'agenda');

  const anniversaryWindowDays = Math.max(
    1,
    Math.ceil((to.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) + 2,
  );

  const [
    vl6Events,
    personalEvents,
    googleConnection,
    personalTasks,
    personalNotes,
    anniversaryEntries,
    paramasonicEntities,
  ] = await Promise.all([
      canReadVl6
        ? safeFetch('eventos VL6', [], () =>
            container.useCases.listEventsInRange.execute(session.authContext, { from, to }),
          )
        : Promise.resolve([]),
      safeFetch('compromissos pessoais', [], () =>
        container.useCases.listMyPersonalEvents.execute(session.authContext, { from, to }),
      ),
      safeFetch('conexão com o Google Agenda', null, () =>
        container.repositories.googleCalendarConnection.findByUserId(
          session.authContext.tenantId,
          session.authContext.uid,
        ),
      ),
      safeFetch('minhas tarefas', [], () =>
        container.useCases.listMyPersonalTasks.execute(session.authContext),
      ),
      safeFetch('minhas anotações', [], () =>
        container.useCases.listMyPersonalNotes.execute(session.authContext),
      ),
      canReadMembers
        ? safeFetch('datas comemorativas dos Irmãos', [], () =>
            container.useCases.listUpcomingAnniversaries.execute(session.authContext, {
              withinDays: anniversaryWindowDays,
            }),
          )
        : Promise.resolve([]),
      canReadVl6
        ? safeFetch('entidades paramaçônicas', [], () =>
            container.repositories.paramasonicEntity.listByTenant(session.authContext.tenantId),
          )
        : Promise.resolve([]),
    ]);

  const agendaAnniversaries: AgendaAnniversarySummary[] = anniversaryEntries.map(
    (entry, index) => {
      const occurrence = new Date();
      occurrence.setHours(12, 0, 0, 0);
      occurrence.setDate(occurrence.getDate() + entry.diasAte);

      const titulo =
        entry.kind === 'nascimento'
          ? `Aniversário de ${entry.nomeCompleto}`
          : entry.kind === 'conjuge'
            ? `Aniversário de ${entry.conjugeNome ?? 'cônjuge'} · família de ${entry.nomeCompleto}`
            : entry.kind === 'filho'
              ? `Aniversário de ${entry.filhoNome ?? 'filho(a)'} · família de ${entry.nomeCompleto}`
              : entry.kind === 'iniciacao'
                ? `Aniversário de Iniciação · ${entry.nomeCompleto}`
                : entry.kind === 'elevacao'
                  ? `Aniversário de Elevação · ${entry.nomeCompleto}`
                  : `Aniversário de Exaltação · ${entry.nomeCompleto}`;

      return {
        id: `anniversary-${entry.kind}-${entry.memberId}-${occurrence.getFullYear()}-${index}`,
        memberId: entry.memberId,
        titulo,
        inicio: occurrence,
        kind: entry.kind,
      };
    },
  );

  const paramasonicEntityNames = Object.fromEntries(
    paramasonicEntities.map((entity) => [
      entity.id,
      entity.unitNumber ? `${entity.shortName} nº ${entity.unitNumber}` : entity.shortName,
    ]),
  );

  // Cache local (nunca chama a Calendar API a cada render) — só populado
  // quando conectado e com a preferência "exibir eventos Google" ligada.
  const googleEvents: GoogleCalendarEventSummary[] =
    googleConnection && googleConnection.preferences.exibirEventosGoogle
      ? await safeFetch('eventos Google em cache', [], async () =>
          (
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
          })),
        )
      : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        kicker="Agenda Central VL6"
        title="Tudo que acontece na Loja, em um só lugar"
        description="Sessões, eventos, aniversários, Paramaçônicas, compromissos pessoais e calendários conectados em uma visão única."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          canManageHeroPhoto && (
            <PageHeroPhotoUpload
              pageKey="agenda"
              path="/agenda"
              hasPhoto={Boolean(heroPhoto)}
              initialPosicao={heroPhoto?.posicao ?? 50}
            />
          )
        }
      />

      {!canReadVl6 && (
        <EmptyState
          icon={<Lock size={18} strokeWidth={1.75} />}
          title="Eventos da Loja indisponíveis"
          description="Sua função não tem acesso à Agenda institucional. Seus compromissos pessoais continuam abaixo."
          className="border-border rounded-xl border bg-white py-6"
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <MyAgendaView
          vl6Events={vl6Events}
          personalEvents={personalEvents}
          googleEvents={googleEvents}
          anniversaries={agendaAnniversaries}
          paramasonicEntityNames={paramasonicEntityNames}
          personalNotes={personalNotes}
        />
        <AgendaSidebar
          personalTasks={personalTasks}
          personalNotes={personalNotes}
          googleConnection={googleConnection}
        />
      </div>
    </div>
  );
}
