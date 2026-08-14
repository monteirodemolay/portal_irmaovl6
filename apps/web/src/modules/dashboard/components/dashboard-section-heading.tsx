import Link from 'next/link';

export function DashboardSectionHeading({
  title,
  href,
  hrefLabel = 'Ver todos',
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="text-accent text-xs font-medium hover:underline">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}
