import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { getBoardPositionLabel } from '@vl6/shared';
import { ArchiveItemCard, EmptyState, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

interface PersonHighlight {
  memberId: string;
  nomeCompleto: string;
  grauLabel: string;
  cargoLabel: string;
  gestaoNome: string;
  periodoInicio: Date;
}

export default async function ArchivePeoplePage() {
  const session = await requirePagePermission('boardTerm:read');
  const { tenantId } = session.authContext;

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
    [...mostRecentByMember.entries()].map(async ([memberId, highlight]) => ({
      member: await container.repositories.member.findById(memberId),
      highlight,
    })),
  );

  const people: PersonHighlight[] = membersWithHighlight
    .map(({ member, highlight }) => {
      if (!member) return null;
      return {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        grauLabel: MEMBER_DEGREE_LABELS[member.grau],
        cargoLabel: getBoardPositionLabel(highlight.cargo),
        gestaoNome: highlight.gestaoNome,
        periodoInicio: highlight.periodoInicio,
      };
    })
    .filter((person): person is PersonHighlight => person !== null)
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Pessoas"
        description="Irmãos cuja trajetória institucional já está registrada nas gestões da Loja."
        backHref="/acervo"
      />

      {people.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhuma trajetória registrada ainda"
          description="Trajetórias institucionais aparecerão aqui conforme as gestões forem cadastradas."
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
              descricao={`${person.cargoLabel} · ${person.gestaoNome}`}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
