import Link from 'next/link';
import { BackButton } from './back-button';

/**
 * Cabeçalho padrão das áreas especializadas do Acervo VL6. As rotas
 * existentes continuam funcionais, mas passam a ter uma origem visual e
 * navegacional única em `/acervo`. Dois jeitos de voltar, propósitos
 * diferentes: `BackButton` usa o histórico do navegador (regressa pra ONDE
 * o Irmão estava — inclusive uma busca com filtros na URL); o `Link` abaixo
 * é um atalho hierárquico fixo pra listagem "canônica" daquele tipo, sempre
 * disponível mesmo sem histórico (ex.: link compartilhado aberto direto).
 */
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
      <div className="flex items-center gap-3">
        <BackButton />
        <span className="text-border">·</span>
        <Link
          href={backHref ?? '/acervo'}
          className="text-muted hover:text-accent text-[11px] font-medium uppercase tracking-wide"
        >
          Acervo VL6{backLabel ? ` · ${backLabel}` : ''}
        </Link>
      </div>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {description && <p className="text-muted mt-1 text-sm">{description}</p>}
    </div>
  );
}
