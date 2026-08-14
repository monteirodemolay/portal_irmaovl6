import * as React from 'react';
import { cn } from '../lib/cn';

export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Toggle visual sobre um `<input type="checkbox">` real — mesma semântica de
 * formulário nativo (`name`, `defaultChecked`, ausente do FormData quando
 * desmarcado) que os Server Actions já esperam (`formData.get(key) === 'on'`).
 * Puramente um upgrade visual do checkbox padrão, não um componente novo de
 * estado.
 */
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <span className={cn('relative inline-flex h-6 w-11 shrink-0 items-center', className)}>
      <input type="checkbox" ref={ref} className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'bg-border pointer-events-none absolute inset-0 rounded-full transition-colors',
          'peer-checked:bg-primary',
          'peer-focus-visible:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          'peer-checked:translate-x-5',
        )}
      />
    </span>
  ),
);
Switch.displayName = 'Switch';
