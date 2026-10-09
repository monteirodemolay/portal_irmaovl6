'use client';

import { useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@vl6/ui';
import type { AppShellModuleNavigation } from './app-shell';
import { resolveActiveNavigation } from '@/lib/navigation/navigation-selection';

export function ModuleNavigation({ navigation, pathname }: {
  navigation: AppShellModuleNavigation;
  pathname: string;
}) {
  const router = useRouter();
  const id = useId();
  const items = navigation.overview ? [navigation.overview, ...navigation.links] : navigation.links;
  const active = resolveActiveNavigation(items, pathname) ?? navigation.overview;
  return (
    <div className="border-border bg-surface sticky top-[72px] z-10 border-b px-5 py-3 lg:px-9 print:hidden">
      <div className="mx-auto max-w-[1440px]">
        <div className="md:hidden">
          <label htmlFor={id} className="text-muted mb-1 block text-xs font-medium">Seção de {navigation.title}</label>
          <select id={id} value={active?.href ?? ''}
            onChange={(event) => router.push(event.target.value)}
            className="border-border bg-surface text-foreground focus-visible:ring-accent min-h-11 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2">
            {items.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
          </select>
        </div>
        <nav aria-label={`Seções de ${navigation.title}`} className="hidden flex-wrap gap-1 md:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active?.href === item.href ? 'page' : undefined}
              className={cn('focus-visible:ring-accent inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2',
                active?.href === item.href ? 'bg-primary text-white font-semibold' : 'text-muted hover:bg-background hover:text-foreground')}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
