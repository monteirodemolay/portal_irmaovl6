'use client';

import { useTransition } from 'react';
import { cn } from '@vl6/ui';

export function RecordingLink({
  href,
  label,
  onRecord,
  className,
}: {
  href: string;
  label: string;
  onRecord: () => Promise<void>;
  className?: string;
}) {
  const [, startTransition] = useTransition();

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('text-primary hover:underline', className)}
      onClick={() => startTransition(onRecord)}
    >
      {label}
    </a>
  );
}
