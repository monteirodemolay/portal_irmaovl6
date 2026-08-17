import type { ComponentType } from 'react';
import type { Event } from '@vl6/domain';
import { Clock, NotebookText, Shirt } from '@vl6/ui';

interface InfoItem {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  value: string;
}

export function AgendaEventImportantInfo({ event }: { event: Event }) {
  const items: InfoItem[] = [
    { icon: Shirt, label: 'Traje', value: event.traje ?? '—' },
    { icon: Clock, label: 'Chegada sugerida', value: event.chegadaSugerida ?? '—' },
    { icon: NotebookText, label: 'Observações', value: event.observacoes ?? '—' },
  ];

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.label}
          className="border-border grid grid-cols-[34px_1fr] gap-2.5 rounded-lg border bg-[#fbfcfd] p-3.5"
        >
          <span className="border-accent/40 text-accent flex h-8 w-8 items-center justify-center rounded-full border">
            <item.icon size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-muted text-[9px] font-bold uppercase tracking-wide">{item.label}</p>
            <p className="mt-1.5 text-xs leading-relaxed">{item.value}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
