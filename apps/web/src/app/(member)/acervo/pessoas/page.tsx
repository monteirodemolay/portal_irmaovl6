import Link from 'next/link';
import { resolveAreaAtuacao } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { getBoardPositionLabel, type AreaAtuacaoKey } from '@vl6/shared';
import { ArchiveItemCard, EmptyState, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { AcervoAreaFacetBar } from '@/modules/archive/components/acervo-area-facet-bar';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

interface PersonHighlight {
  memberId: string;
  nomeCompleto: string;
  grauLabel: string;
  cargoLabel: string;
  gestaoNome: string;
  periodoInicio: Date;
  /**
   * Área de atuação profissional — ponte Acervo → Diretório (Fase E, busca
   * cruzada). Só preenchida quando o Irmão publicou o bloco "profissional"
   * na Central ("cadastrar ≠ publicar"): o Acervo VL6 nunca revela um dado
   * que o titular não escolheu tornar público.
   */
  area: { key: AreaAtuacaoKey; label: string } | null;
}

export default async function ArchivePeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const session = await requirePagePermission('boardTerm:read');
  const { tenantId } = session.authContext;
  const { area: activeArea } = await searchParams;

  const container = createServerContainer();
  const terms = await container.repositories.boardTerm.listByTenant(tenantId);

  const termsWithAssignments = await Promise.all(
    terms.map(async (term) => ({
      term,
      assignments: await container.repositories.boardPositionAssignment.listByGestao(term.id),
    })),
  );

  const mostRecentByMember = new Map<
    string,
    { cargo: string; gestaoNome: string; periodoInicio: Date }
  >();
  for (const { term, assignments } of termsWithAssignments) {
    for (const assignment of assignments) {
      const current = mostRecentByMember.get(assignment.memberId);
      if (!current || term.periodoInicio > current.periodoInicio) {
        mostRecentByMember.set(assignment.memberId, {
          cargo: assignment.cargo,
          gestaoNome: term.nome,
          periodoInicio: term.periodoInicio,
        });
      }
    }
  }

  const membersWithHighlight = await Promise.all(
    [...mostRecentByMember.entries()].map(async ([memberId, highlight]) => {
      const [member, settings, profile] = await Promise.all([
        container.repositories.member.findById(memberId),
        container.repositories.publicationSettings.findByMemberId(tenantId, memberId),
        container.repositories.memberCentralProfile.findByMemberId(tenantId, memberId),
      ]);
      return { member, highlight, settings, profile };
    }),
  );

  const allPeople: PersonHighlight[] = membersWithHighlight
    .map(({ member, highlight, settings, profile }) => {
      if (!member) return null;
      return {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        grauLabel: MEMBER_DEGREE_LABELS[member.grau],
        cargoLabel: getBoardPositionLabel(highlight.cargo),
        gestaoNome: highlight.gestaoNome,
        periodoInicio: highlight.periodoInicio,
        area: settings?.blocks.profissional ? resolveAreaAtuacao(profile) : null,
      };
    })
    .filter((person): person is PersonHighlight => person !== null)
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

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Pessoas"
        description="Irmãos cuja trajetória institucional já está registrada nas gestões da Loja."
        backHref="/acervo"
      />

      {areaFacets.length > 0 && (
        <AcervoAreaFacetBar areaFacets={areaFacets} activeArea={activeArea} />
      )}

      {allPeople.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhuma trajetória registrada ainda"
          description="Trajetórias institucionais aparecerão aqui conforme as gestões forem cadastradas."
        />
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum Irmão nesta área"
          description="Ninguém com trajetória registrada publicou essa área de atuação na Central."
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
              descricao={
                person.area
                  ? `${person.cargoLabel} · ${person.gestaoNome} · ${person.area.label}`
                  : `${person.cargoLabel} · ${person.gestaoNome}`
              }
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
