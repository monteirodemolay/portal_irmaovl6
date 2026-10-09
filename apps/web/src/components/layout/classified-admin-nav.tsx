'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ClassifiedAdminNavItem {
  href: string;
  label: string;
  description?: string;
}

export interface ClassifiedAdminNavGroup {
  key: 'normal' | 'master' | 'advanced';
  title: string;
  description: string;
  items: ClassifiedAdminNavItem[];
}

const GROUP_STYLES: Record<ClassifiedAdminNavGroup['key'], string> = {
  normal: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/15',
  master: 'border-sky-200 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/15',
  advanced: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/15',
};

const BADGE_STYLES: Record<ClassifiedAdminNavGroup['key'], string> = {
  normal: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  master: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  advanced: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function GroupContent({
  group,
  pathname,
}: {
  group: ClassifiedAdminNavGroup;
  pathname: string;
}) {
  return (
    <nav className="mt-3 space-y-1" aria-label={group.title}>
      {group.items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`block rounded-xl border px-3 py-2.5 transition-colors ${
              active
                ? 'border-primary/30 bg-surface text-foreground shadow-sm'
                : 'border-transparent hover:border-border hover:bg-surface/80'
            }`}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
            {item.description ? (
              <span className="text-muted mt-0.5 block text-xs leading-relaxed">{item.description}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function ClassifiedAdminNav({ groups }: { groups: ClassifiedAdminNavGroup[] }) {
  const pathname = usePathname();
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const primaryGroups = visibleGroups.filter((group) => group.key !== 'advanced');
  const advancedGroup = visibleGroups.find((group) => group.key === 'advanced');

  if (visibleGroups.length === 0) return null;

  return (
    <section aria-label="Organização administrativa" className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[11px] font-semibold uppercase tracking-[0.14em]">
            Organização do back-office
          </p>
          <p className="mt-1 text-sm font-semibold">Fluxo principal primeiro; exceções somente quando necessárias</p>
        </div>
        <p className="text-muted max-w-xl text-xs">
          A operação cotidiana fica visível. Cadastros mestres aparecem como fontes reutilizáveis. Ferramentas técnicas e legadas permanecem verificáveis, mas recolhidas para não competir com o fluxo normal.
        </p>
      </div>

      {primaryGroups.length > 0 ? (
        <div className={`grid gap-3 ${primaryGroups.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {primaryGroups.map((group) => {
            const hasActive = group.items.some((item) => isActive(pathname, item.href));
            return (
              <div
                key={group.key}
                className={`rounded-2xl border p-4 ${GROUP_STYLES[group.key]} ${hasActive ? 'ring-primary/20 ring-2' : ''}`}
              >
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${BADGE_STYLES[group.key]}`}>
                  {group.title}
                </span>
                <p className="text-muted mt-2 text-xs leading-relaxed">{group.description}</p>
                <GroupContent group={group} pathname={pathname} />
              </div>
            );
          })}
        </div>
      ) : null}

      {advancedGroup ? (
        <details
          className={`rounded-2xl border ${GROUP_STYLES.advanced}`}
          open={advancedGroup.items.some((item) => isActive(pathname, item.href))}
        >
          <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${BADGE_STYLES.advanced}`}>
                  {advancedGroup.title}
                </span>
                <p className="text-muted mt-2 text-xs leading-relaxed">{advancedGroup.description}</p>
              </div>
              <span className="text-muted text-xs font-semibold">Abrir ferramentas técnicas</span>
            </div>
          </summary>
          <div className="border-t border-amber-200/70 p-4 dark:border-amber-900/60">
            <GroupContent group={advancedGroup} pathname={pathname} />
          </div>
        </details>
      ) : null}
    </section>
  );
}
