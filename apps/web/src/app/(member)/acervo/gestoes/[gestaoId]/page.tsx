import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { BOARD_POSITION_LABELS } from '@vl6/shared';
import { Avatar, AvatarFallback, AvatarImage, EmptyState, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

function formatPeriod(inicio: Date, fim: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'long' });
  return `${formatter.format(new Date(inicio))} a ${formatter.format(new Date(fim))}`;
}

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default async function ArchiveBoardTermDetailPage({
  params,
}: {
  params: Promise<{ gestaoId: string }>;
}) {
  const session = await requirePagePermission('boardTerm:read');
  const { gestaoId } = await params;

  const container = createServerContainer();
  const term = await container.repositories.boardTerm.findById(gestaoId);
  if (!term || term.tenantId !== session.authContext.tenantId) notFound();

  const assignments = await container.repositories.boardPositionAssignment.listByGestao(term.id);
  const members = await Promise.all(
    assignments.map((assignment) => container.repositories.member.findById(assignment.memberId)),
  );

  const seats = assignments
    .map((assignment, index) => {
      const member = members[index];
      if (!member) return null;
      return {
        assignmentId: assignment.id,
        cargo: assignment.cargo,
        ordem: assignment.ordem,
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        fotoUrl: member.fotoUrl,
        grau: member.grau,
      };
    })
    .filter((seat): seat is NonNullable<typeof seat> => seat !== null)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title={term.nome}
        description={formatPeriod(term.periodoInicio, term.periodoFim)}
        backHref="/acervo/gestoes"
        backLabel="Gestões"
      />

      {seats.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="Nenhum cargo registrado nesta gestão"
          description="A composição da Diretoria aparecerá aqui assim que for cadastrada."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seats.map((seat) => (
            <Link
              key={seat.assignmentId}
              href={`/acervo/pessoas/${seat.memberId}`}
              className="border-border hover:border-accent group flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Avatar>
                {seat.fotoUrl && <AvatarImage src={seat.fotoUrl} alt="" />}
                <AvatarFallback>{initials(seat.nomeCompleto)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                  {BOARD_POSITION_LABELS[seat.cargo]}
                </div>
                <h3 className="font-display group-hover:text-accent truncate font-semibold transition-colors">
                  {seat.nomeCompleto}
                </h3>
                <p className="text-muted text-xs">{MEMBER_DEGREE_LABELS[seat.grau]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
