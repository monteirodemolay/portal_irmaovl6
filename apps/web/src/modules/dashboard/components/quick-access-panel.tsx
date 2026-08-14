import { CalendarDays, Megaphone } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { QuickLinkCard, type QuickLinkItem } from './quick-link-card';

const QUICK_LINKS: QuickLinkItem[] = [
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
];

export function QuickAccessPanel() {
  return (
    <section className="flex flex-col gap-3">
      <DashboardSectionHeading title="Acesso rápido" />
      <div className="grid grid-cols-2 gap-3">
        {QUICK_LINKS.map((item) => (
          <QuickLinkCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}
