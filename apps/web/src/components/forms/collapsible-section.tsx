import type { ReactNode } from 'react';
import { ChevronDown, cn } from '@vl6/ui';

export interface CollapsibleSectionProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description?: string;
  /** Curto resumo à direita do título quando fechado (ex.: "3/5 preenchidos"). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Seção recolhível reutilizada pelo editor assistido de perfil
 * (`/admin/pessoas/irmaos/[memberId]`) — o spec da Fase 2 pede explicitamente
 * "seções recolhíveis, resumo de completude e estados claros", nunca uma
 * sequência de cartões iguais. `<details>`/`<summary>` nativo — sem estado
 * de React, sem dependência nova; abre/fecha e é acessível de graça.
 */
export function CollapsibleSection({
  icon: Icon,
  title,
  description,
  summary,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'border-border bg-background group rounded-2xl border [&_summary::-webkit-details-marker]:hidden',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="flex min-w-0 items-center gap-3">
          <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-display truncate text-base font-semibold">{title}</span>
            {description && <span className="text-muted truncate text-sm">{description}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {summary && <span className="text-muted text-xs font-medium">{summary}</span>}
          <ChevronDown
            size={18}
            className="text-muted transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="border-border flex flex-col gap-4 border-t p-5">{children}</div>
    </details>
  );
}
