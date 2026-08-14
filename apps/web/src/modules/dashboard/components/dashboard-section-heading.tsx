import type { ComponentType } from 'react';
import Link from 'next/link';

export function DashboardSectionHeading({
  icon: Icon,
  title,
  href,
  hrefLabel = 'Ver todos',
}: {
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      {Icon && (
        <span className="bg-accent/15 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Icon size={16} strokeWidth={1.75} />
        </span>
      )}
      <h2 className="font-display shrink-0 text-sm font-semibold uppercase tracking-wide">
        {title}
      </h2>
      <div className="bg-accent/30 h-px flex-1" />
      {href && (
        <Link href={href} className="text-accent shrink-0 text-xs font-medium hover:underline">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}
