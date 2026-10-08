import { ContextReturn } from '@/components/layout/context-link';

export function AcervoPageHeader({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div>
      <ContextReturn
        fallbackHref={backHref ?? '/acervo'}
        fallbackLabel={backLabel ? `Voltar para ${backLabel}` : 'Voltar ao Acervo VL6'}
      />
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {description && <p className="text-muted mt-1 text-sm">{description}</p>}
    </div>
  );
}
