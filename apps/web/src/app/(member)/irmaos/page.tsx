import {
  hasPermission,
  type PublicMemberProfileDTO,
  type BusinessDirectoryEntryDTO,
} from '@vl6/domain';
import type { AreaAtuacaoKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Lock, Search } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AreaExploreGrid } from '@/modules/central/components/directorio/area-explore-grid';
import { BusinessDirectoryCard } from '@/modules/central/components/negocios/business-directory-card';
import {
  CommunitySearchPanel,
  type CommunityFiltersValues,
  type CommunityTipo,
} from '@/modules/central/components/comunidade/community-search-panel';
import { CommunityMemberCard } from '@/modules/central/components/comunidade/community-member-card';
import { PersonalSummaryCard } from '@/modules/central/components/comunidade/personal-summary-card';

type SearchParams = Record<string, string | undefined>;

function parseTipo(raw: string | undefined): CommunityTipo {
  if (raw === 'irmaos' || raw === 'negocios') return raw;
  return 'tudo';
}

export default async function ComunidadeVL6Page({
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
        title="Comunidade VL6 indisponível"
        description="Sua função não tem acesso à Comunidade VL6. Fale com a Secretaria da Loja se acha que isso é um engano."
      />
    );
  }

  const container = createServerContainer();

  const tipo = parseTipo(params.tipo);
  const filters: CommunityFiltersValues = {
    q: params.q || undefined,
    cidade: params.cidade || undefined,
    areaAtuacao: (params.areaAtuacao as AreaAtuacaoKey) || undefined,
    profissao: params.profissao || undefined,
    tag: params.tag || undefined,
    empresa: params.empresa || undefined,
    segmento: params.segmento || undefined,
    online: params.online === '1' || undefined,
    desconto: params.desconto === '1' || undefined,
  };

  // Cartão pessoal — mesma leitura que alimentaria `SpaceHeader`/`CompletionRing`
  // em Meu Espaço, feita uma única vez aqui (documento de referência: "evitar
  // leituras duplicadas entre o cartão pessoal, diretório e negócios").
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  const [centralProfile, publicationSettings] = member
    ? await Promise.all([
        container.repositories.memberCentralProfile.findByMemberId(
          session.authContext.tenantId,
          member.id,
        ),
        container.repositories.publicationSettings.findByMemberId(
          session.authContext.tenantId,
          member.id,
        ),
      ])
    : [null, null];

  // Reaproveita os dois casos de uso já existentes do Diretório e de
  // Negócios & Serviços — nunca reescreve lógica de busca/filtro nova
  // (documento de referência: "reaproveitar e combinar os casos de uso
  // atuais"). Só chama o(s) necessário(s) pro `tipo` selecionado.
  const [directoryResult, businessResult] = await Promise.all([
    tipo !== 'negocios'
      ? container.useCases.searchDirectory.execute(session.authContext, {
          termo: filters.q,
          profissao: filters.profissao,
          areaAtuacao: filters.areaAtuacao,
          tag: filters.tag,
          empresa: filters.empresa,
          cidade: filters.cidade,
        })
      : null,
    tipo !== 'irmaos'
      ? container.useCases.searchBusinessDirectory.execute(session.authContext, {
          termo: filters.q,
          segmento: filters.segmento,
          cidade: filters.cidade,
          atendeOnline: filters.online,
        })
      : null,
  ]);

  if ((directoryResult && !directoryResult.ok) || (businessResult && !businessResult.ok)) {
    return <EmptyState title="Não foi possível carregar a Comunidade VL6." />;
  }

  const memberItems: PublicMemberProfileDTO[] = directoryResult?.ok
    ? directoryResult.value.items
    : [];
  let businessItems: BusinessDirectoryEntryDTO[] = businessResult?.ok
    ? businessResult.value.items
    : [];
  // "Condição especial para Irmãos" não é filtro do caso de uso — recorte
  // adicional sobre o resultado já autorizado, feito aqui na página (não é
  // ocultação de dado sensível, é apenas um filtro de conveniência sobre
  // dados já liberados pelo caso de uso).
  if (filters.desconto) {
    businessItems = businessItems.filter((item) => item.ofereceDescontoIrmaos);
  }

  const areaFacets = directoryResult?.ok ? directoryResult.value.areaFacets : [];
  const directoryOptions = directoryResult?.ok
    ? directoryResult.value.filterOptions
    : { profissoes: [], cidades: [], tags: [], empresas: [] };
  const businessOptions = businessResult?.ok
    ? businessResult.value.filterOptions
    : { segmentos: [], cidades: [] };

  const resultCount = memberItems.length + businessItems.length;
  const hasActiveFilter = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Comunidade VL6</h1>
        <p className="text-muted text-sm">
          Pessoas, conhecimentos, empresas e serviços que fortalecem nossa Loja.
        </p>
      </div>

      {member ? (
        <PersonalSummaryCard
          member={member}
          profile={centralProfile}
          profilePublished={publicationSettings?.profilePublished ?? false}
        />
      ) : (
        <EmptyState
          title="Sua conta ainda não está vinculada a um cadastro de Irmão"
          description="Fale com a Secretaria da Loja para vincular seu usuário ao seu registro e ter seu próprio espaço na Comunidade VL6."
        />
      )}

      <CommunitySearchPanel
        tipo={tipo}
        filters={filters}
        directoryOptions={directoryOptions}
        businessOptions={businessOptions}
        areaFacets={areaFacets}
        resultCount={resultCount}
      />

      {tipo !== 'negocios' && areaFacets.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Explore por área</h2>
          <AreaExploreGrid areaFacets={areaFacets} activeArea={filters.areaAtuacao} />
        </section>
      )}

      {resultCount === 0 ? (
        <EmptyState
          icon={<Search size={22} strokeWidth={1.75} />}
          title={
            hasActiveFilter ? 'Nenhum resultado encontrado' : 'A Comunidade ainda está começando'
          }
          description={
            hasActiveFilter
              ? 'Tente buscar por outro nome, profissão, competência, empresa ou cidade.'
              : 'Assim que Irmãos publicarem perfis e negócios, eles aparecem aqui.'
          }
        />
      ) : (
        <>
          {tipo !== 'negocios' && memberItems.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold">Irmãos</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {memberItems.map((profile) => (
                  <CommunityMemberCard key={profile.memberId} profile={profile} />
                ))}
              </div>
            </section>
          )}

          {tipo !== 'irmaos' && businessItems.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold">Negócios e Serviços</h2>
              <p className="text-muted text-sm">
                Empresas, profissionais e serviços compartilhados voluntariamente pelos Irmãos da
                Verdadeira Luz. As informações são publicadas pelos respectivos responsáveis — a
                Loja não intermedeia contratações nem garante produtos ou serviços.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {businessItems.map((entry) => (
                  <BusinessDirectoryCard key={entry.businessId} entry={entry} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
