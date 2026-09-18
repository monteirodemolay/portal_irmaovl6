import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent, EmptyState, Textarea } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { BaixasTabs } from '@/modules/library/components/baixas-tabs';
import { attestLibraryOccurrenceAction } from '@/modules/library/actions/library-actions';

export default async function Page({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const session = await requirePagePermission('libraryItem:manage');
  const { all } = await searchParams;
  const showAll = all === '1';
  const c = createServerContainer();
  const [items, occurrences] = await Promise.all([
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listOccurrencesByTenant(session.authContext.tenantId),
  ]);
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const pending = occurrences.filter((o) =>
    ['relatado', 'em_analise'].includes(o.statusOcorrencia),
  );
  const visible = showAll ? occurrences : pending;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Ocorrências e baixa de livros</h1>
        <p className="text-muted text-sm">
          Perda, roubo, extravio ou dano irrecuperável, sempre com atesto.
        </p>
      </header>
      <BaixasTabs active="ocorrencias" pendingCount={pending.length} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted text-sm">
          {showAll ? 'Mostrando todas as ocorrências.' : 'Mostrando só as pendentes de decisão.'}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={showAll ? '/admin/acervo/biblioteca/baixas/ocorrencias' : '?all=1'}>
            {showAll ? 'Ver só pendentes' : 'Ver todas'}
          </Link>
        </Button>
      </div>
      {!visible.length ? (
        <EmptyState title={showAll ? 'Nenhuma ocorrência' : 'Nenhuma ocorrência pendente'} />
      ) : (
        <div className="grid gap-3">
          {visible.map((o) => (
            <Card key={o.id}>
              <CardContent className="grid gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>
                    {itemMap.get(o.libraryItemId)?.titulo ?? 'Obra'} · {o.motivo}
                  </b>
                  <Badge variant={o.statusOcorrencia === 'confirmado' ? 'destructive' : 'outline'}>
                    {o.statusOcorrencia}
                  </Badge>
                </div>
                <p className="text-sm">{o.relato}</p>
                {['relatado', 'em_analise'].includes(o.statusOcorrencia) && (
                  <form
                    action={attestLibraryOccurrenceAction}
                    className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <input type="hidden" name="occurrenceId" value={o.id} />
                    <Textarea
                      name="librarianAttestation"
                      required
                      minLength={10}
                      placeholder="Atesto do Bibliotecário"
                    />
                    <Button
                      name="decision"
                      value="confirmado"
                      variant="destructive"
                      className="w-full sm:w-auto"
                    >
                      Confirmar baixa
                    </Button>
                    <Button
                      name="decision"
                      value="rejeitado"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Rejeitar relato
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
