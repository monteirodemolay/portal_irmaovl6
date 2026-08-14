import { hasPermission } from '@vl6/domain';
import type { AreaAtuacaoKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Lock, Search } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AreaExploreGrid } from '@/modules/central/components/directorio/area-explore-grid';
import { DirectoryMetricsPanel } from '@/modules/central/components/directorio/directory-metrics';
import {
  DirectorySearchPanel,
  type DirectoryFiltersValues,
} from '@/modules/central/components/directorio/directory-search-panel';
import { MemberDirectoryCard } from '@/modules/central/components/directorio/member-directory-card';

type SearchParams = Record<string, string | undefined>;

export default async function IrmaosDiretorioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  // Diretório é uma das duas abas de "Irmãos", sempre visível na navegação
  // (a permissão específica é checada aqui, não escondendo a aba) — quem
  // não tem `memberDirectory:read` vê uma mensagem explicativa em vez de
  // um 404 ou de estourar `ForbiddenError` chamando o Use Case sem checar.
  if (!hasPermission(session.authContext, 'memberDirectory:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Diretório indisponível"
        description="Sua função não tem acesso ao Diretório dos Irmãos. Fale com a Secretaria da Loja se acha que isso é um engano."
      />
    );
  }

  const filters: DirectoryFiltersValues = {
    q: params.q || undefined,
    profissao: params.profissao || undefined,
    areaAtuacao: (params.areaAtuacao as AreaAtuacaoKey) || undefined,
    competencia: params.competencia || undefined,
    servico: params.servico || undefined,
    empresa: params.empresa || undefined,
    cidade: params.cidade || undefined,
  };

  const container = createServerContainer();
  const result = await container.useCases.searchDirectory.execute(session.authContext, {
    termo: filters.q,
    profissao: filters.profissao,
    areaAtuacao: filters.areaAtuacao,
    competencia: filters.competencia,
    servico: filters.servico,
    empresa: filters.empresa,
    cidade: filters.cidade,
  });

  if (!result.ok) {
    return <EmptyState title="Não foi possível carregar o Diretório." />;
  }

  const { items, metrics, areaFacets } = result.value;
  const hasActiveFilter = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <DirectorySearchPanel filters={filters} />

      <DirectoryMetricsPanel metrics={metrics} />

      {areaFacets.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Explore por área</h2>
          <AreaExploreGrid areaFacets={areaFacets} activeArea={filters.areaAtuacao} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Conheça os Irmãos</h2>
        {items.length === 0 ? (
          <EmptyState
            icon={<Search size={22} strokeWidth={1.75} />}
            title={
              hasActiveFilter ? 'Nenhum resultado encontrado' : 'Ninguém publicou um perfil ainda'
            }
            description={
              hasActiveFilter
                ? 'Tente buscar por outro nome, profissão, competência ou área.'
                : 'Assim que algum Irmão publicar informações no Diretório, elas aparecem aqui.'
            }
          />
        ) : (
          <>
            <p className="text-muted text-sm">
              {items.length} {items.length === 1 ? 'Irmão encontrado' : 'Irmãos encontrados'}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((profile) => (
                <MemberDirectoryCard key={profile.memberId} profile={profile} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
