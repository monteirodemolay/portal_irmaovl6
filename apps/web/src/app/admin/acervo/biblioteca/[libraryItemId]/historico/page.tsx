import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { LibraryLoanEventKind, LibraryOccurrenceReason } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

const EVENT_LABEL: Record<LibraryLoanEventKind, string> = {
  solicitacao: 'Solicitação de empréstimo',
  aprovacao: 'Aprovação',
  prorrogacao_retirada: 'Prorrogação do prazo de retirada',
  nao_retirado: 'Reserva liberada (não retirado)',
  recusa: 'Recusa',
  retirada: 'Retirada',
  atraso: 'Atraso',
  lembrete: 'Lembrete enviado',
  devolucao: 'Devolução',
  cancelamento: 'Cancelamento',
};

const OCCURRENCE_REASON_LABEL: Record<LibraryOccurrenceReason, string> = {
  perda: 'Perda',
  roubo: 'Roubo',
  extravio: 'Extravio',
  dano_irrecuperavel: 'Dano irrecuperável',
  outro: 'Outro motivo',
};

interface TimelineEntry {
  occurredAt: Date;
  label: string;
  description: string;
  tone: 'default' | 'warning' | 'success';
}

export default async function LibraryItemHistoryPage({
  params,
}: {
  params: Promise<{ libraryItemId: string }>;
}) {
  const session = await requirePagePermission('libraryItem:manage');
  const { libraryItemId } = await params;
  const c = createServerContainer();
  const item = await c.repositories.libraryItem.findById(libraryItemId);
  if (!item || item.tenantId !== session.authContext.tenantId || item.deletedAt) notFound();

  const copies = await c.repositories.libraryCirculation.listCopiesByItem(
    session.authContext.tenantId,
    libraryItemId,
  );
  const copy = copies[0] ?? null;

  const [events, occurrences] = copy
    ? await Promise.all([
        c.repositories.libraryCirculation.listLoanEventsByCopy(
          session.authContext.tenantId,
          copy.id,
        ),
        c.repositories.libraryCirculation.listOccurrencesByTenant(session.authContext.tenantId),
      ])
    : [[], []];
  const copyOccurrences = copy ? occurrences.filter((o) => o.copyId === copy.id) : [];

  const timeline: TimelineEntry[] = [
    ...events.map((event) => ({
      occurredAt: event.occurredAt,
      label: EVENT_LABEL[event.tipo],
      description: event.descricao,
      tone:
        event.tipo === 'devolucao'
          ? ('success' as const)
          : ['recusa', 'cancelamento', 'nao_retirado', 'atraso'].includes(event.tipo)
            ? ('warning' as const)
            : ('default' as const),
    })),
    ...copyOccurrences.map((occurrence) => ({
      occurredAt: occurrence.occurredAt,
      label: `Ocorrência: ${OCCURRENCE_REASON_LABEL[occurrence.motivo]}`,
      description: [
        occurrence.relato,
        occurrence.librarianAttestation
          ? `Parecer do Bibliotecário (${occurrence.statusOcorrencia}): ${occurrence.librarianAttestation}`
          : `Situação: ${occurrence.statusOcorrencia}`,
      ]
        .filter(Boolean)
        .join(' — '),
      tone:
        occurrence.statusOcorrencia === 'confirmado' ? ('warning' as const) : ('default' as const),
    })),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Histórico do exemplar</h1>
          <p className="text-muted text-sm">
            {item.titulo ?? 'Obra sem título'}
            {copy ? ` · Tombo ${copy.codigoTombo}` : ''}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={`/admin/acervo/biblioteca/${item.id}/editar`}>Voltar à obra</Link>
        </Button>
      </header>

      {!copy ? (
        <EmptyState
          title="Obra sem exemplar físico"
          description="Só obras com exemplar físico têm histórico de circulação."
        />
      ) : timeline.length === 0 ? (
        <EmptyState
          title="Nenhum movimento registrado"
          description="Este exemplar ainda não teve empréstimo, devolução ou ocorrência."
        />
      ) : (
        <ol className="grid gap-3">
          {timeline.map((entry, index) => (
            <li key={index}>
              <Card
                className={
                  entry.tone === 'warning'
                    ? 'border-amber-300'
                    : entry.tone === 'success'
                      ? 'border-emerald-300'
                      : undefined
                }
              >
                <CardContent className="grid gap-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={
                        entry.tone === 'warning'
                          ? 'destructive'
                          : entry.tone === 'success'
                            ? 'success'
                            : 'outline'
                      }
                    >
                      {entry.label}
                    </Badge>
                    <span className="text-muted text-xs">
                      {entry.occurredAt.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm">{entry.description}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
