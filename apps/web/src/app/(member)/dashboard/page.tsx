import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import {
  Badge,
  BookOpen,
  CalendarDays,
  Card,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Handshake,
  Image as GalleryIcon,
  MapPin,
  Megaphone,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
} from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

/**
 * Frases rotativas puramente decorativas — sem entidade de domínio própria
 * (não é conteúdo editorial da Loja, é só o "quote of the day" do
 * dashboard). Escolhida deterministicamente pelo dia do ano, então é
 * estável ao longo do dia em vez de mudar a cada reload.
 */
const QUOTES = [
  'A Maçonaria não faz dos homens melhores do que são, mas os faz melhores do que poderiam ser.',
  'Fazei o bem por amor ao próprio bem.',
  'A união faz a força; a fraternidade a torna duradoura.',
  'O verdadeiro templo do Maçom é o coração dos seus semelhantes.',
  'Trabalhar é orar; a Loja é a escola da virtude.',
];

function quoteOfTheDay(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return (
    QUOTES[dayOfYear % QUOTES.length] ?? 'Que a Virtude, a Luz e a Graça estejam sempre conosco.'
  );
}

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
  { href: '/diretoria', label: 'Diretoria', description: 'Conheça a atual gestão.', icon: Users },
  {
    href: '/galeria',
    label: 'Galeria',
    description: 'Registros de momentos especiais.',
    icon: GalleryIcon,
  },
] as const;

const VALUE_PROPS = [
  {
    label: 'Acesso Restrito e Seguro',
    description: 'Conteúdo exclusivo para Irmãos da Loja.',
    icon: ShieldCheck,
  },
  {
    label: 'Tradição e Modernidade',
    description: 'Unindo os valores da Ordem com a tecnologia.',
    icon: Sparkles,
  },
  {
    label: 'União e Fraternidade',
    description: 'Fortalecendo os laços entre Irmãos.',
    icon: Handshake,
  },
  {
    label: 'Conhecimento Contínuo',
    description: 'Estudo, reflexão e evolução constante.',
    icon: GraduationCap,
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

  const displayName = member?.nomeMaconico ?? member?.nomeCompleto?.split(' ')[0] ?? 'Irmão';

  return (
    <div className="flex flex-col gap-10">
      <section className="bg-primary relative overflow-hidden rounded-lg px-8 py-10 text-white shadow-md">
        <div className="bg-accent/10 absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-2">
          <p className="text-accent text-sm font-medium uppercase tracking-wide">
            {current.tenant.nome}
          </p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Seja bem-vindo, <span className="text-accent italic">{displayName}!</span>
          </h1>
          <p className="max-w-xl text-white/70">
            Que a Virtude, a Luz e a Graça estejam sempre conosco. Aqui você acompanha avisos,
            eventos, arquivos e tudo o que move a nossa Oficina.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_ACCESS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-accent group flex h-full flex-col gap-3 p-4 transition-colors">
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card className="flex flex-col gap-4 p-5">
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

        <Card className="flex flex-col gap-4 p-5">
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

        <Card className="bg-primary flex flex-col justify-between gap-4 p-5 text-white">
          <Quote size={28} className="text-accent" />
          <p className="font-display text-sm italic leading-relaxed">"{quoteOfTheDay()}"</p>
          <p className="text-accent text-right text-xs uppercase tracking-wide">Frase do dia</p>
        </Card>
      </section>

      <section className="border-border grid grid-cols-1 gap-6 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <span className="bg-accent/15 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <item.icon size={18} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-muted text-xs">{item.description}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
