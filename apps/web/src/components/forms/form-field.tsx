import type { ReactNode } from 'react';
import { Label } from '@vl6/ui';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  children: ReactNode;
}

/**
 * Wrapper único de label + erro + descrição para campos de formulário —
 * nenhum módulo deve remontar essa marcação manualmente
 * (docs/architecture/05-componentes.md §5.5). Recebe o input já ligado ao
 * `react-hook-form` via `register(...)` pelo chamador.
 */
export function FormField({ label, htmlFor, error, description, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description && !error && <p className="text-muted text-xs">{description}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
