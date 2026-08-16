import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, CalendarDays, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

function formatPeriod(inicio: Date, fim: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short' });
  return `${formatter.format(new Date(inicio))} — ${formatter.format(new Date(fim))}`;
}

export default async function ArchiveBoardTermsPage() {
  const session = await requirePagePermission('boardTerm:read');

  const container = createServerContainer();
  const terms = await container.repositories.boardTerm.listByTenant(session.authContext.tenantId);
  const sorted = [...terms].sort(
    (a, b) => new Date(b.periodoInicio).getTime() - new Date(a.periodoInicio).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Gestões"
        description="Diretorias que já conduziram a Loja, período a período."
        backHref="/acervo"
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="Nenhuma gestão registrada ainda"
          description="As gestões da Loja aparecerão aqui assim que forem cadastradas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((term) => (
            <ArchiveItemCard
              key={term.id}
              href={`/acervo/gestoes/${term.id}`}
              kindLabel="Gestão"
              icon={<CalendarDays size={14} />}
              titulo={term.nome}
              descricao={formatPeriod(term.periodoInicio, term.periodoFim)}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
