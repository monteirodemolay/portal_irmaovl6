import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import {
  getBoardPositionHierarchyRank,
  getBoardPositionOrdinalLabel,
  type BoardPositionKey,
} from '@vl6/shared';
import { Avatar, AvatarFallback, EmptyState, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { RelationsSection } from '@/modules/archive/components/relations-section';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

/** Cargos com card grande (foto) na abertura — o resto vira card de texto agrupado. */
const HERO_KEYS: BoardPositionKey[] = ['veneravel_mestre'];
const VIGILANTE_KEYS: BoardPositionKey[] = ['primeiro_vigilante', 'segundo_vigilante'];
/** Recorte editorial só pra rotular as duas seções de texto — não é regra de negócio nova. */
const ADMINISTRACAO_KEYS: BoardPositionKey[] = [
  'orador',
  'secretario',
  'tesoureiro',
  'chanceler',
  'hospitaleiro',
];

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

interface Seat {
  assignmentId: string;
  cargo: string;
  ordem: number;
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  grau: keyof typeof MEMBER_DEGREE_LABELS;
}

function TextSeatCard({ seat, label }: { seat: Seat; label: string }) {
  return (
    <Link
      href={`/acervo/pessoas/${seat.memberId}`}
      className="border-border hover:border-accent group rounded-lg border p-4 transition-colors"
    >
      <div className="text-accent text-[10px] font-semibold uppercase tracking-wider">{label}</div>
      <h3 className="font-display group-hover:text-accent truncate font-semibold transition-colors">
        {seat.nomeCompleto}
      </h3>
      <p className="text-muted text-xs">{MEMBER_DEGREE_LABELS[seat.grau]}</p>
    </Link>
  );
}

/** Card compacto (foto circular pequena) — lateralizado ao lado do card do Venerável, não abaixo. */
function VigilanteCard({ seat, label }: { seat: Seat; label: string }) {
  return (
    <Link
      href={`/acervo/pessoas/${seat.memberId}`}
      className="border-border hover:border-accent group flex flex-1 items-center gap-3 rounded-xl border p-3 transition-colors"
    >
      <div className="bg-bg flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {seat.fotoUrl ? (
          <img src={seat.fotoUrl} alt={seat.nomeCompleto} className="h-full w-full object-cover" />
        ) : (
          <span className="text-muted font-display text-sm">{initials(seat.nomeCompleto)}</span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-display group-hover:text-accent truncate text-sm font-semibold transition-colors">
          {seat.nomeCompleto}
        </h3>
        <p className="text-accent text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
    </Link>
  );
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

  const [assignments, committees] = await Promise.all([
    container.repositories.boardPositionAssignment.listByGestao(term.id),
    container.repositories.committee.listByGestao(term.id),
  ]);
  const members = await Promise.all(
    assignments.map((assignment) => container.repositories.member.findById(assignment.memberId)),
  );

  // Membros de Comissão não necessariamente ocupam cargo na Diretoria —
  // busca à parte, sem duplicar quem já foi carregado acima.
  const boardMemberIds = new Set(assignments.map((assignment) => assignment.memberId));
  const committeeMemberIds = [
    ...new Set(committees.flatMap((committee) => committee.membrosIds)),
  ].filter((id) => !boardMemberIds.has(id));
  const committeeMembers = await Promise.all(
    committeeMemberIds.map((id) => container.repositories.member.findById(id)),
  );
  const memberById = new Map(
    [...members, ...committeeMembers]
      .filter((member) => member !== null)
      .map((member) => [member.id, member]),
  );

  const seats: Seat[] = assignments
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
    .filter((seat): seat is Seat => seat !== null)
    // Hierarquia maçônica clássica primeiro, ordem de cadastro só como
    // desempate dentro do mesmo cargo (Diácono/Experto admitem mais de um
    // titular na mesma Gestão).
    .sort((a, b) => {
      const rankDiff =
        getBoardPositionHierarchyRank(a.cargo) - getBoardPositionHierarchyRank(b.cargo);
      return rankDiff !== 0 ? rankDiff : a.ordem - b.ordem;
    });

  // Posição do titular dentro do próprio cargo (1-based) — dá "1º
  // Diácono"/"2º Diácono" sem depender do Administrador ter digitado a
  // ordem certa no cadastro, só da ordem relativa entre eles.
  const posicaoNoCargo = new Map<string, number>();
  const counters: Record<string, number> = {};
  for (const seat of seats) {
    counters[seat.cargo] = (counters[seat.cargo] ?? 0) + 1;
    posicaoNoCargo.set(seat.assignmentId, counters[seat.cargo]!);
  }

  const veneravel = seats.find((seat) => HERO_KEYS.includes(seat.cargo as BoardPositionKey));
  const vigilantes = seats.filter((seat) =>
    VIGILANTE_KEYS.includes(seat.cargo as BoardPositionKey),
  );
  const administracao = seats.filter((seat) =>
    ADMINISTRACAO_KEYS.includes(seat.cargo as BoardPositionKey),
  );
  const oficiais = seats.filter(
    (seat) =>
      !HERO_KEYS.includes(seat.cargo as BoardPositionKey) &&
      !VIGILANTE_KEYS.includes(seat.cargo as BoardPositionKey) &&
      !ADMINISTRACAO_KEYS.includes(seat.cargo as BoardPositionKey),
  );

  return (
    <div className="flex flex-col gap-8">
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
        <>
          {(veneravel || vigilantes.length > 0) && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_15rem]">
              {veneravel && (
                <div className="bg-bg border-border grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-[1fr_auto]">
                  <div className="flex flex-col justify-center gap-1 p-8">
                    <h2 className="font-display text-3xl font-semibold">
                      {veneravel.nomeCompleto}
                    </h2>
                    <p className="text-accent font-medium">Venerável Mestre</p>
                  </div>
                  <div className="bg-surface flex h-48 w-full items-center justify-center sm:h-auto sm:w-56">
                    {veneravel.fotoUrl ? (
                      <img
                        src={veneravel.fotoUrl}
                        alt={veneravel.nomeCompleto}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Avatar className="h-24 w-24">
                        <AvatarFallback className="text-2xl">
                          {initials(veneravel.nomeCompleto)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              )}

              {vigilantes.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {vigilantes.map((seat) => (
                    <VigilanteCard
                      key={seat.assignmentId}
                      seat={seat}
                      label={getBoardPositionOrdinalLabel(
                        seat.cargo,
                        posicaoNoCargo.get(seat.assignmentId) ?? 0,
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {administracao.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold">Administração</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {administracao.map((seat) => (
                  <TextSeatCard
                    key={seat.assignmentId}
                    seat={seat}
                    label={getBoardPositionOrdinalLabel(
                      seat.cargo,
                      posicaoNoCargo.get(seat.assignmentId) ?? 0,
                    )}
                  />
                ))}
              </div>
            </section>
          )}

          {oficiais.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold">Oficiais</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {oficiais.map((seat) => (
                  <TextSeatCard
                    key={seat.assignmentId}
                    seat={seat}
                    label={getBoardPositionOrdinalLabel(
                      seat.cargo,
                      posicaoNoCargo.get(seat.assignmentId) ?? 0,
                    )}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {committees.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Comissões Permanentes</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {committees.map((committee) => (
              <div key={committee.id} className="border-border rounded-lg border p-4">
                <h3 className="font-display font-semibold">{committee.nome}</h3>
                {committee.descricao && (
                  <p className="text-muted mt-1 text-xs">{committee.descricao}</p>
                )}
                <ul className="mt-3 flex flex-col gap-2 border-t border-dashed pt-3">
                  {committee.membrosIds.map((membroId) => {
                    const membro = memberById.get(membroId);
                    return (
                      <li key={membroId} className="text-sm">
                        {membro ? (
                          <Link href={`/acervo/pessoas/${membro.id}`} className="hover:text-accent">
                            {membro.nomeCompleto}
                          </Link>
                        ) : (
                          <span className="text-muted">Irmão não encontrado</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <RelationsSection
        nodeTipo="boardTerm"
        nodeId={term.id}
        centerLabel={term.nome}
        centerKindLabel="Gestão"
        authContext={session.authContext}
        container={container}
      />
    </div>
  );
}
