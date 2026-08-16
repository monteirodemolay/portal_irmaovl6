import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProvenanceField {
  label: string;
  value: React.ReactNode;
}

export interface ProvenancePanelProps {
  fields: ProvenanceField[];
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Painel de procedência/metadados do Item do Acervo — origem, autoria,
 * catalogação. Exibe só os campos com valor real; nunca preenche lacuna com
 * dado inventado (Regra de Preservação nº4 da evolução do Acervo VL6).
 */
export function ProvenancePanel({ fields, footer, className }: ProvenancePanelProps) {
  const visibleFields = fields.filter((field) => field.value !== null && field.value !== undefined);

  return (
    <section
      aria-labelledby="provenance-title"
      className={cn('border-border bg-surface rounded-lg border p-5', className)}
    >
      <h2
        id="provenance-title"
        className="font-display text-sm font-semibold uppercase tracking-wide"
      >
        Procedência
      </h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {visibleFields.map((field) => (
          <div key={field.label}>
            <dt className="text-muted text-[11px] font-semibold uppercase tracking-wide">
              {field.label}
            </dt>
            <dd className="mt-0.5 text-sm">{field.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="border-border mt-4 border-t pt-4 text-sm">{footer}</div>}
    </section>
  );
}
