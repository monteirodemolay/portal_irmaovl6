import { Quote } from '@vl6/ui';
import type { MasonicQuote } from '../lib/masonic-quotes';

/**
 * Faixa compacta "flutuante" sobre a borda inferior do banner de saudação
 * — pra ocupar o mínimo de espaço vertical possível e ler como uma
 * continuação do banner, não um bloco à parte. `line-clamp-3` (em vez de
 * truncar numa linha só) porque frases cadastradas pelo Admin em Conteúdo →
 * Frases podem ser mais longas que o banco embutido e precisam aparecer
 * inteiras na maioria dos casos.
 */
export function DailyQuoteCard({ quote }: { quote: MasonicQuote }) {
  return (
    <div className="bg-surface border-border flex items-start gap-2 rounded-xl border p-3 shadow-lg">
      <Quote size={14} strokeWidth={1.75} className="text-accent mt-0.5 shrink-0" />
      <p className="text-foreground line-clamp-3 min-w-0 text-xs italic sm:text-sm">
        &ldquo;{quote.text}&rdquo;{' '}
        <span className="text-muted font-medium uppercase not-italic tracking-wide">
          — {quote.author}
        </span>
      </p>
    </div>
  );
}
