import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArrowLeft, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { SessionReviewRow } from '@/modules/agenda/components/session-review-row';

/**
 * Painel dedicado de revisão em lote — Sessões com
 * `classificationReviewRequired` (texto legado ambíguo, `classifyLegacySession`
 * não teve segurança pra classificar sozinho). Antes só dava pra achar essas
 * Sessões reabrindo cada uma na edição normal do Evento.
 */
export default async function AgendaClassificationReviewPage() {
  const session = await requirePagePermission('event:manage');
  const container = createServerContainer();

  const sessions = await container.useCases.listSessionsPendingReview.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/conteudo/agenda"
          className="text-muted mb-2 flex items-center gap-1 text-xs hover:underline"
        >
          <ArrowLeft size={14} />
          Agenda / Eventos
        </Link>
        <h1 className="font-display text-2xl font-semibold">Revisão de classificação</h1>
        <p className="text-muted text-sm">
          Sessões cujo texto antigo não deu segurança suficiente pra classificar sozinho — confirme
          o Tipo, a Natureza, o Grau dos trabalhos e o Acesso de cada uma.
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="Nenhuma Sessão pendente de revisão" />
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((event) => (
            <SessionReviewRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
