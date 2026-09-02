import Link from 'next/link';
import {
  getMemberJourneyCargos,
  getMemberJourneyCommittees,
  resolveAreaAtuacao,
} from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import {
  getBoardPositionLabel,
  MEMBER_DEGREES,
  MEMBER_SITUATION_STATUS_LABELS,
  MEMBER_SITUATION_STATUSES,
  type AreaAtuacaoKey,
  type MemberDegree,
  type MemberSituationStatus,
} from '@vl6/shared';
import { ArchiveItemCard, Button, EmptyState, Input, Select, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { AcervoAreaFacetBar } from '@/modules/archive/components/acervo-area-facet-bar';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

interface PersonHighlight {
  memberId: string;
  nomeCompleto: string;
  grauLabel: string;
  situacaoLabel: string;
  /** Cargo/comissão mais recente já ocupado — `null` quando o Irmão nunca teve nenhum. */
  papelLabel: string | null;
  gestaoNome: string | null;
  /**
   * Área de atuação profissional — ponte Acervo → Diretório (Fase E, busca
   * cruzada). Só preenchida quando o Irmão publicou o bloco "profissional"
   * na Central ("cadastrar ≠ publicar"): o Acervo VL6 nunca revela um dado
   * que o titular não escolheu tornar público.
   */
  area: { key: AreaAtuacaoKey; label: string } | null;
}

const FETCH_PAGE_LIMIT = 500;
const MAX_FETCH_PAGES = 10;

export default async function ArchivePeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grau?: string; situacao?: string; area?: string }>;
}) {
  const session = await requirePagePermission('boardTerm:read');
  const { tenantId } = session.authContext;
  const {
    q: termo,
    grau: grauFiltro,
    situacao: situacaoFiltro,
    area: activeArea,
  } = await searchParams;

  const container = createServerContainer();

  // Todo Irmão institucional não excluído tem um lugar no Acervo — antes
  // esta página só listava quem já ocupou cargo de Diretoria, escondendo
  // Irmãos com comissão, com fotos/eventos vinculados, ou simplesmente sem
  // nenhum cargo ainda. Mesma correção de princípio já aplicada ao
  // Diretório (`SearchDirectoryUseCase`, Fase 1 da Comunidade VL6).
  const members = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const result = await container.repositories.member.search(
      {
        tenantId,
        nome: termo?.trim() || undefined,
        grau: grauFiltro || undefined,
        situacao: situacaoFiltro || undefined,
      },
      { limit: FETCH_PAGE_LIMIT, cursor },
    );
    members.push(...result.items);
    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }

  const journeyDeps = {
    memberPositionHistoryRepository: container.repositories.memberPositionHistory,
    boardTermRepository: container.repositories.boardTerm,
    committeeRepository: container.repositories.committee,
  };

  const membersWithHighlight = await Promise.all(
    members.map(async (member) => {
      const [cargos, comissoes, settings, profile] = await Promise.all([
        getMemberJourneyCargos(journeyDeps, member.id),
        getMemberJourneyCommittees(journeyDeps, tenantId, member.id),
        container.repositories.publicationSettings.findByMemberId(tenantId, member.id),
        container.repositories.memberCentralProfile.findByMemberId(tenantId, member.id),
      ]);
      return { member, cargos, comissoes, settings, profile };
    }),
  );

  const allPeople: PersonHighlight[] = membersWithHighlight
    .map(({ member, cargos, comissoes, settings, profile }) => {
      const cargoMaisRecente = cargos[0];
      const comissaoMaisRecente = comissoes[0];
      const useCargo =
        cargoMaisRecente &&
        (!comissaoMaisRecente || cargoMaisRecente.dataInicio >= comissaoMaisRecente.dataInicio);
      const papel = useCargo
        ? cargoMaisRecente
          ? {
              label: getBoardPositionLabel(cargoMaisRecente.cargo),
              gestaoNome: cargoMaisRecente.gestaoNome,
            }
          : null
        : comissaoMaisRecente
          ? { label: comissaoMaisRecente.nome, gestaoNome: comissaoMaisRecente.gestaoNome }
          : null;

      return {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        grauLabel: MEMBER_DEGREE_LABELS[member.grau],
        situacaoLabel: MEMBER_SITUATION_STATUS_LABELS[member.situacao],
        papelLabel: papel?.label ?? null,
        gestaoNome: papel?.gestaoNome ?? null,
        area: settings?.blocks.profissional ? resolveAreaAtuacao(profile) : null,
      };
    })
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));

  const areaFacets = Array.from(
    allPeople.reduce((map, person) => {
      if (!person.area) return map;
      const existing = map.get(person.area.key);
      map.set(person.area.key, {
        key: person.area.key,
        label: person.area.label,
        count: (existing?.count ?? 0) + 1,
      });
      return map;
    }, new Map<AreaAtuacaoKey, { key: AreaAtuacaoKey; label: string; count: number }>()),
  )
    .map(([, facet]) => facet)
    .sort((a, b) => b.count - a.count);

  const people = activeArea
    ? allPeople.filter((person) => person.area?.key === activeArea)
    : allPeople;

  const hasActiveFilter = Boolean(termo || grauFiltro || situacaoFiltro || activeArea);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Pessoas"
        description="Todo Irmão da Loja com algum registro institucional — cargos, comissões, eventos ou fotos do Acervo."
        backHref="/acervo"
      />

      <form
        method="get"
        className="border-border bg-surface flex flex-wrap items-end gap-3 rounded-xl border p-4"
      >
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className="text-muted mb-1 block text-xs font-medium">
            Buscar por nome
          </label>
          <Input id="q" name="q" defaultValue={termo} placeholder="Nome do Irmão" />
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="grau" className="text-muted mb-1 block text-xs font-medium">
            Grau
          </label>
          <Select id="grau" name="grau" defaultValue={grauFiltro ?? ''}>
            <option value="">Todos</option>
            {MEMBER_DEGREES.map((grau: MemberDegree) => (
              <option key={grau} value={grau}>
                {MEMBER_DEGREE_LABELS[grau]}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[160px]">
          <label htmlFor="situacao" className="text-muted mb-1 block text-xs font-medium">
            Situação
          </label>
          <Select id="situacao" name="situacao" defaultValue={situacaoFiltro ?? ''}>
            <option value="">Todas</option>
            {MEMBER_SITUATION_STATUSES.map((situacao: MemberSituationStatus) => (
              <option key={situacao} value={situacao}>
                {MEMBER_SITUATION_STATUS_LABELS[situacao]}
              </option>
            ))}
          </Select>
        </div>
        {activeArea && <input type="hidden" name="area" value={activeArea} />}
        <div className="flex gap-2">
          <Button type="submit" variant="primary">
            Filtrar
          </Button>
          {hasActiveFilter && (
            <Button type="button" variant="outline" asChild>
              <Link href="/acervo/pessoas">Limpar</Link>
            </Button>
          )}
        </div>
      </form>

      {areaFacets.length > 0 && (
        <AcervoAreaFacetBar areaFacets={areaFacets} activeArea={activeArea} />
      )}

      <p className="text-muted text-sm">
        {people.length} {people.length === 1 ? 'Irmão encontrado' : 'Irmãos encontrados'}
      </p>

      {allPeople.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum Irmão cadastrado ainda"
          description="Irmãos aparecerão aqui conforme forem cadastrados na Loja."
        />
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum Irmão encontrado"
          description="Ajuste os filtros ou a busca para ver outros resultados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <ArchiveItemCard
              key={person.memberId}
              href={`/acervo/pessoas/${person.memberId}`}
              kindLabel={person.grauLabel}
              icon={<Users size={14} />}
              titulo={person.nomeCompleto}
              descricao={[
                person.papelLabel && person.gestaoNome
                  ? `${person.papelLabel} · ${person.gestaoNome}`
                  : person.situacaoLabel,
                person.area?.label,
              ]
                .filter(Boolean)
                .join(' · ')}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
