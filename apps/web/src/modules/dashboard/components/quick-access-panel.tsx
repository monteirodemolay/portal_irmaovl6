import type { ComponentType } from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Card, FileText, LayoutGrid, Megaphone, Users } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';

interface QuickAccessItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

function QuickAccessButton({ item }: { item: QuickAccessItem }) {
  return (
    <Link
      href={item.href}
      className="hover:bg-surface group flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-center transition-colors"
    >
      <span className="bg-accent/15 text-accent group-hover:bg-accent group-hover:text-primary-dark flex h-11 w-11 items-center justify-center rounded-full transition-colors">
        <item.icon size={20} strokeWidth={1.75} />
      </span>
      <span className="text-xs font-medium leading-tight">{item.label}</span>
    </Link>
  );
}

// Um único painel com todos os atalhos como botões compactos lado a lado —
// em vez de cada atalho virar seu próprio card grande e solto na tela.
export function QuickAccessPanel({ showDirectoryLink }: { showDirectoryLink: boolean }) {
  const items: QuickAccessItem[] = [
    ...(showDirectoryLink ? [{ href: '/central', label: 'Central dos Irmãos', icon: Users }] : []),
    { href: '/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/avisos', label: 'Avisos', icon: Megaphone },
    { href: '#acervo-vl6', label: 'Acervo VL6', icon: LayoutGrid },
    { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
    { href: '/arquivos', label: 'Documentos', icon: FileText },
  ];

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading icon={LayoutGrid} title="Acessos rápidos" />
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => (
          <QuickAccessButton key={item.href} item={item} />
        ))}
      </div>
    </Card>
  );
}
