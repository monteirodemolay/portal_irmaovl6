import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EVENT_KINDS, type EventKind } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { EventForm } from '@/modules/agenda/components/event-form';
import { createWorkspaceEventAction } from '@/modules/agenda/actions/agenda-actions';

export const metadata = { title: 'Novo acontecimento · VL6' };

export default async function NewPublicationPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requirePagePermission('event:create');
  if (!hasPermission(session.authContext, 'event:read')) notFound();
  const { tipo } = await searchParams;
  const initialType: EventKind | undefined = EVENT_KINDS.includes(tipo as EventKind)
    ? (tipo as EventKind)
    : undefined;
  const c = createServerContainer();
  const entities = await c.repositories.paramasonicEntity.listByTenant(
    session.authContext.tenantId,
  );
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link href="/admin/publicacoes" className="text-sm underline">
        ← Todos os acontecimentos
      </Link>
      <header className="border-border bg-surface rounded-3xl border p-6 md:p-8">
        <p className="text-accent text-sm font-semibold uppercase tracking-wide">Entrada única</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">Registrar acontecimento</h1>
        <p className="text-muted mt-3 max-w-3xl">
          Informe o fato uma única vez. Ao salvar, o Portal abrirá a Ficha Única para continuar
          notícia, aviso, fotos, vídeos, documentos, divulgação, relacionamentos e memória sem
          repetir o cadastro em outras áreas.
        </p>
        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-5">
          {['1. Acontecimento', '2. Comunicação', '3. Mídias', '4. Acervo', '5. Memória'].map(
            (label, index) => (
              <div
                key={label}
                className={`rounded-xl border px-3 py-2 font-semibold ${
                  index === 0 ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'
                }`}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </header>
      <div className="border-border bg-surface rounded-2xl border p-6">
        <EventForm
          action={createWorkspaceEventAction}
          initialType={initialType}
          paramasonicEntities={entities.map((e) => ({
            id: e.id,
            label: e.unitNumber ? `${e.shortName} nº ${e.unitNumber}` : e.shortName,
          }))}
        />
      </div>
    </div>
  );
}
