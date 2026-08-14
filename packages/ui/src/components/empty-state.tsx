import * as React from 'react';
import { cn } from '../lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-8 text-center', className)}>
      {icon && (
        <span className="bg-primary/10 text-primary mb-1 flex h-12 w-12 items-center justify-center rounded-full">
          {icon}
        </span>
      )}
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
