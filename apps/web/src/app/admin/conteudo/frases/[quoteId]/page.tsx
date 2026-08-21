import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  deleteInspirationalQuoteAction,
  toggleInspirationalQuoteActiveAction,
  updateInspirationalQuoteAction,
} from '@/modules/content/actions/content-actions';
import { QuoteForm } from '@/modules/content/components/quote-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { DeleteButton } from '@/components/admin/delete-button';

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
        <div className="flex items-center gap-2">
          <PublishToggleButton
            published={quote.ativa}
            onToggle={toggleInspirationalQuoteActiveAction.bind(null, quote.id)}
            labels={{ on: 'Ativar', off: 'Desativar' }}
          />
          <DeleteButton
            action={deleteInspirationalQuoteAction.bind(null, quoteId)}
            confirmMessage={`Excluir esta frase? Fica registrada em Concluídos.`}
            redirectTo="/admin/conteudo/frases"
          />
        </div>
      </div>
      <QuoteForm action={updateInspirationalQuoteAction.bind(null, quoteId)} quote={quote} />
    </div>
  );
}
