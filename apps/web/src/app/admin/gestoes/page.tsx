import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function BoardTermsPage() {
  const session = await requirePagePermission('boardTerm:read');

  const container = createServerContainer();
  const terms = await container.useCases.listBoardTerms.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Gestões / Diretoria</h1>
        <Button asChild>
          <Link href="/admin/gestoes/nova">Nova Gestão</Link>
        </Button>
      </div>

      {terms.length === 0 ? (
        <EmptyState
          title="Nenhuma gestão cadastrada"
          description="Crie a primeira gestão para começar a montar a Diretoria."
          action={
            <Button asChild size="sm">
              <Link href="/admin/gestoes/nova">Nova Gestão</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {terms.map((term) => (
            <Link key={term.id} href={`/admin/gestoes/${term.id}`}>
              <Card className="hover:border-accent transition-colors">
                <CardHeader>
                  <CardTitle>{term.nome}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted text-sm">
                  {formatDate(term.periodoInicio)} — {formatDate(term.periodoFim)}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
