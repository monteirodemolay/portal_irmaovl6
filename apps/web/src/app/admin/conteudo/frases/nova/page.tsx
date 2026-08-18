import { requirePagePermission } from '@/lib/auth/require-permission';
import { createInspirationalQuoteAction } from '@/modules/content/actions/content-actions';
import { QuoteForm } from '@/modules/content/components/quote-form';

export default async function NewInspirationalQuotePage() {
  await requirePagePermission('quote:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Nova Frase</h1>
      <QuoteForm action={createInspirationalQuoteAction} />
    </div>
  );
}
