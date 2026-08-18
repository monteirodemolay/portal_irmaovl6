import { Quote } from '@vl6/ui';
import type { MasonicQuote } from '../lib/masonic-quotes';

/**
 * Faixa compacta "flutuante" sobre a borda inferior do banner de saudação
 * — citação e autor numa linha só, pra ocupar o mínimo de espaço vertical
 * possível e ler como uma continuação do banner, não um bloco à parte.
 */
export function DailyQuoteCard({ quote }: { quote: MasonicQuote }) {
  return (
    <div className="bg-surface border-border flex items-center gap-2 rounded-xl border p-3 shadow-lg">
      <Quote size={14} strokeWidth={1.75} className="text-accent shrink-0" />
      <p className="text-foreground min-w-0 truncate text-xs italic sm:text-sm">
        &ldquo;{quote.text}&rdquo;{' '}
        <span className="text-muted font-medium uppercase not-italic tracking-wide">
          — {quote.author}
        </span>
      </p>
    </div>
  );
}
