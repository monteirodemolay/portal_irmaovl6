import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  toggleInspirationalQuoteActiveAction,
  updateInspirationalQuoteAction,
} from '@/modules/content/actions/content-actions';
import { QuoteForm } from '@/modules/content/components/quote-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

export default async function EditInspirationalQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const session = await requirePagePermission('quote:update');
  const { quoteId } = await params;

  const container = createServerContainer();
  const quote = await container.repositories.inspirationalQuote.findById(quoteId);
  if (!quote || quote.tenantId !== session.authContext.tenantId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Editar Frase</h1>
        <PublishToggleButton
          published={quote.ativa}
          onToggle={toggleInspirationalQuoteActiveAction.bind(null, quote.id)}
          labels={{ on: 'Ativar', off: 'Desativar' }}
        />
      </div>
      <QuoteForm action={updateInspirationalQuoteAction.bind(null, quoteId)} quote={quote} />
    </div>
  );
}
