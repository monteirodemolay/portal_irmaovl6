import type { ComponentType } from 'react';
import Link from 'next/link';
import { Card, ChevronRight } from '@vl6/ui';

export interface QuickLinkItem {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

export function QuickLinkCard({ item }: { item: QuickLinkItem }) {
  return (
    <Link href={item.href}>
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
  );
}
