import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import {
  Badge,
  BookOpen,
  Button,
  CalendarDays,
  Card,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Image as GalleryIcon,
  MapPin,
  Megaphone,
} from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { roleDisplayLabel } from '@/lib/auth/role-display-label';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

// Sem tile de Diretoria: mesmos dados da página pública do site
// institucional, sem nada exclusivo do Portal — docs/architecture/07 §7.0.
const QUICK_ACCESS = [
  {
    href: '/avisos',
    label: 'Avisos',
    description: 'Comunicados e informações importantes.',
    icon: Megaphone,
  },
  {
    href: '/agenda',
    label: 'Agenda',
    description: 'Próximas sessões e eventos.',
    icon: CalendarDays,
  },
  {
    href: '/arquivos',
    label: 'Arquivos',
    description: 'Documentos e circulares oficiais.',
    icon: FileText,
  },
  {
    href: '/biblioteca',
    label: 'Biblioteca',
    description: 'Estudos ao alcance do Irmão.',
    icon: BookOpen,
  },
  {
    href: '/galeria',
    label: 'Galeria',
    description: 'Registros de momentos especiais.',
    icon: GalleryIcon,
  },
  {
    href: '/downloads',
    label: 'Downloads',
    description: 'Materiais liberados para baixar.',
    icon: Download,
  },
] as const;

function formatEventDate(date: Date): { day: string; month: string; time: string } {
  const d = new Date(date);
  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(d),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(d)
      .replace('.', '')
      .toUpperCase(),
    time: new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(d),
  };
}

export default async function DashboardPage() {
  const [session, current] = await Promise.all([getCurrentSession(), getCurrentTenant()]);
  if (!session || !current) return null;

  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );

  const [announcements, upcomingEvents] = await Promise.all([
    hasPermission(session.authContext, 'announcement:read')
      ? container.useCases.listActiveAnnouncements.execute(session.authContext.tenantId)
      : Promise.resolve([]),
    hasPermission(session.authContext, 'event:read')
      ? container.useCases.listUpcomingEvents.execute(session.authContext, { limit: 3 })
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
  ]);

  const displayName = resolveMemberDisplayName(member, session.user.email);

  return (
    <div className="flex flex-col gap-8">
      <section className="from-primary to-primary-dark relative grid gap-6 overflow-hidden rounded-[18px] bg-gradient-to-br px-7 py-8 text-white shadow-md lg:grid-cols-[1.35fr_0.65fr] lg:px-9 lg:py-9">
        <div className="bg-accent/10 absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl" />
        <div className="relative flex flex-col justify-center gap-3">
          <p className="text-accent text-xs font-semibold uppercase tracking-widest">
            {current.tenant.nome}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-[1.1] sm:text-4xl">
            Bem-vindo ao Portal do Irmão
          </h1>
          <p className="max-w-xl text-sm text-white/70">
            Um ambiente reservado para acompanhar os conteúdos, avisos, eventos, documentos e
            informações da {current.tenant.nome}.
          </p>
        </div>

        <div className="relative flex items-center gap-4 self-center rounded-[14px] border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm">
          <MemberAvatar
            fotoUrl={member?.fotoUrl ?? null}
            nome={displayName}
            className="h-14 w-14 shrink-0 ring-2 ring-white/20"
          />
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-white/70">
              {roleDisplayLabel(session.role)} · {current.tenant.nome}
            </p>
            {member && (
              <div className="mt-2">
                <MemberDegreeBadge grau={member.grau} compact />
              </div>
            )}
            <Button asChild variant="accent" size="sm" className="mt-2.5">
              <Link href="/perfil">Ver meu perfil</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_ACCESS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-accent group flex h-full min-h-[112px] flex-col gap-3 p-4 shadow-none transition-colors">
              <span className="bg-accent/15 text-accent flex h-10 w-10 items-center justify-center rounded-full">
                <item.icon size={20} strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold">{item.label}</p>
                <p className="text-muted mt-0.5 text-xs">{item.description}</p>
              </div>
              <ChevronRight
                size={16}
                className="text-accent mt-auto opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-4 p-5 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Próximos Eventos</h2>
            <Link href="/agenda" className="text-accent text-xs font-medium hover:underline">
              Ver agenda
            </Link>
          </div>
          {upcomingEvents.items.length === 0 ? (
            <p className="text-muted text-sm">Nenhum evento programado.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcomingEvents.items.map((event) => {
                const { day, month, time } = formatEventDate(event.dataInicio);
                return (
                  <li key={event.id} className="flex gap-3">
                    <div className="bg-primary flex w-12 shrink-0 flex-col items-center rounded py-1.5 text-white">
                      <span className="text-base font-bold leading-none">{day}</span>
                      <span className="text-accent text-[10px] leading-none">{month}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.titulo}</p>
                      <p className="text-muted flex items-center gap-1 text-xs">
                        <Clock size={12} /> {time}
                        <Badge variant="outline" className="ml-1">
                          {EVENT_KIND_LABELS[event.tipo]}
                        </Badge>
                      </p>
                      <p className="text-muted flex items-center gap-1 text-xs">
                        <MapPin size={12} /> {event.local}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Avisos Recentes</h2>
            <Link href="/avisos" className="text-accent text-xs font-medium hover:underline">
              Ver todos
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-muted text-sm">Nenhum aviso no momento.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {announcements.slice(0, 3).map((announcement) => (
                <li
                  key={announcement.id}
                  className="border-border flex gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <span className="bg-accent/15 text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <Megaphone size={16} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{announcement.titulo}</p>
                    <p className="text-muted line-clamp-1 text-xs">{announcement.descricao}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5 shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Arquivos Recentes</h2>
            <Link href="/arquivos" className="text-accent text-xs font-medium hover:underline">
              Ver todos
            </Link>
          </div>
          <p className="text-muted text-sm">Nenhum arquivo recente.</p>
        </Card>
      </section>
    </div>
  );
}
