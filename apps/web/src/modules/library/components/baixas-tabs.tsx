import Link from 'next/link';
import { cn } from '@vl6/ui';

/** Duas abas da tela "Baixas e ocorrências": registrar uma baixa direta e revisar relatos pendentes. */
export function BaixasTabs({
  active,
  pendingCount,
}: {
  active: 'registrar' | 'ocorrencias';
  pendingCount: number;
}) {
  const tabs = [
    {
      key: 'registrar' as const,
      href: '/admin/acervo/biblioteca/baixas',
      label: 'Registrar baixa',
    },
    {
      key: 'ocorrencias' as const,
      href: '/admin/acervo/biblioteca/baixas/ocorrencias',
      label: `Ocorrências pendentes${pendingCount ? ` (${pendingCount})` : ''}`,
    },
  ];
  return (
    <nav aria-label="Abas de baixas" className="border-border flex w-full border-b">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'mr-1 inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors last:mr-0',
              isActive
                ? 'border-primary text-primary'
                : 'text-muted hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
