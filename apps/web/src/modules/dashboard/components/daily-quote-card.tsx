import { Quote } from '@vl6/ui';
import type { MasonicQuote } from '../lib/masonic-quotes';

export function DailyQuoteCard({ quote }: { quote: MasonicQuote }) {
  return (
    <div className="border-accent/30 bg-accent/5 relative flex items-start gap-3 rounded-xl border p-5">
      <Quote size={18} strokeWidth={1.75} className="text-accent mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-foreground text-sm italic leading-relaxed sm:text-base">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-muted mt-2 text-xs font-medium uppercase tracking-wide">
          {quote.author}
        </p>
      </div>
    </div>
  );
}
