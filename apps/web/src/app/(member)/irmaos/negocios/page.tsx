import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Input, Lock, Search, ShieldCheck } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { BusinessDirectoryCard } from '@/modules/central/components/negocios/business-directory-card';

type SearchParams = Record<string, string | undefined>;

export default async function NegociosDiretorioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (!hasPermission(session.authContext, 'memberDirectory:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Negócios & Serviços indisponível"
        description="Sua função não tem acesso a esta área. Fale com a Secretaria da Loja se acha que isso é um engano."
      />
    );
  }

  const filters = {
    q: params.q || undefined,
    segmento: params.segmento || undefined,
    cidade: params.cidade || undefined,
    online: params.online === '1' || undefined,
  };

  const container = createServerContainer();
  const result = await container.useCases.searchBusinessDirectory.execute(session.authContext, {
    termo: filters.q,
    segmento: filters.segmento,
    cidade: filters.cidade,
    atendeOnline: filters.online,
  });

  if (!result.ok) {
    return <EmptyState title="Não foi possível carregar Negócios & Serviços." />;
  }

  const { items, totalEmpresas } = result.value;
  const hasActiveFilter = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <form method="get" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-3">
            <Search
              size={16}
              className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <Input
              type="search"
              name="q"
              placeholder="Buscar empresa, serviço, segmento, cidade ou responsável…"
              defaultValue={filters.q ?? ''}
              className="pl-9"
            />
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            Segmento
            <Input name="segmento" defaultValue={filters.segmento ?? ''} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Cidade
            <Input name="cidade" defaultValue={filters.cidade ?? ''} />
          </label>
          <button
            type="submit"
            className="bg-primary self-end rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Buscar
          </button>
        </div>
        <label className="flex w-fit items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="online"
            value="1"
            defaultChecked={Boolean(filters.online)}
            className="accent-primary"
          />
          Mostrar só quem atende online/remoto
        </label>
      </form>

      <div className="border-border bg-surface flex items-start gap-3 rounded-xl border p-4 text-sm">
        <ShieldCheck size={18} className="text-muted mt-0.5 shrink-0" strokeWidth={1.75} />
        <p className="text-muted">
          Atividades publicadas voluntariamente pelos próprios Irmãos. A Loja não intermedeia nem
          garante produtos ou serviços aqui listados.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Rede de Confiança VL6</h2>
          <p className="text-muted text-sm">
            {totalEmpresas} {totalEmpresas === 1 ? 'atividade publicada' : 'atividades publicadas'}
          </p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Search size={22} strokeWidth={1.75} />}
            title={
              hasActiveFilter
                ? 'Nenhum resultado encontrado'
                : 'Ninguém publicou uma atividade ainda'
            }
            description={
              hasActiveFilter
                ? 'Tente buscar por outro nome, segmento ou cidade.'
                : 'Assim que algum Irmão publicar uma empresa ou serviço no seu perfil, ela aparece aqui.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((entry) => (
              <BusinessDirectoryCard key={entry.businessId} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
