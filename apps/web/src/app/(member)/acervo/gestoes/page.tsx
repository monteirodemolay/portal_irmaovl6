import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { BoardTerm } from '@vl6/domain';
import { CalendarDays, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { MemberAvatar } from '@/components/membership/member-avatar';

/** Único cargo com card grande (foto) na abertura de uma Gestão — mesmo recorte de `[gestaoId]/page.tsx`. */
const VENERAVEL_CARGO = 'veneravel_mestre';

function formatPeriod(inicio: Date, fim: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short' });
  return `${formatter.format(new Date(inicio))} — ${formatter.format(new Date(fim))}`;
}

interface GestaoCardData {
  term: BoardTerm;
  veneravelNome: string | null;
  veneravelFotoUrl: string | null;
}

/**
 * Card da listagem de Gestões — foto do Venerável Mestre centralizada
 * acima do nome da Gestão (pedido do Administrador), reaproveitando
 * `MemberAvatar` (recorte circular, sempre centralizado e proporcional,
 * mesmo padrão usado no resto do Portal) em vez do `thumbnailUrl`
 * retangular de `ArchiveItemCard` — pensado pra fotos de paisagem/
 * documento, não pra retrato de rosto. Sem Venerável cadastrado ainda,
 * cai no mesmo círculo com o ícone de calendário usado antes.
 */
function GestaoCard({ term, veneravelNome, veneravelFotoUrl }: GestaoCardData) {
  return (
    <Link
      href={`/acervo/gestoes/${term.id}`}
      className="border-border hover:border-accent focus-visible:ring-accent group flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {veneravelNome ? (
        <MemberAvatar
          fotoUrl={veneravelFotoUrl}
          nome={veneravelNome}
          className="h-16 w-16"
          disablePreview
        />
      ) : (
        <div className="bg-background text-muted flex h-16 w-16 items-center justify-center rounded-full">
          <CalendarDays size={22} />
        </div>
      )}
      <div>
        <div className="text-accent flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
          <CalendarDays size={14} />
          Gestão
        </div>
        <h3 className="font-display group-hover:text-accent mt-2 font-semibold transition-colors">
          {term.nome}
        </h3>
        <p className="text-muted mt-1 text-xs leading-5">
          {formatPeriod(term.periodoInicio, term.periodoFim)}
        </p>
        {veneravelNome && <p className="text-muted mt-1 text-xs">{veneravelNome}</p>}
      </div>
    </Link>
  );
}

export default async function ArchiveBoardTermsPage() {
  const session = await requirePagePermission('boardTerm:read');

  const container = createServerContainer();
  const terms = await container.repositories.boardTerm.listByTenant(session.authContext.tenantId);
  const sorted = [...terms].sort(
    (a, b) => new Date(b.periodoInicio).getTime() - new Date(a.periodoInicio).getTime(),
  );

  const cards: GestaoCardData[] = await Promise.all(
    sorted.map(async (term) => {
      const assignment = await container.repositories.boardPositionAssignment.findByGestaoAndCargo(
        term.id,
        VENERAVEL_CARGO,
      );
      const veneravel = assignment
        ? await container.repositories.member.findById(assignment.memberId)
        : null;
      return {
        term,
        veneravelNome: veneravel?.nomeCompleto ?? null,
        veneravelFotoUrl: veneravel?.fotoUrl ?? null,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Gestões"
        description="Diretorias que já conduziram a Loja, período a período."
        backHref="/acervo"
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="Nenhuma gestão registrada ainda"
          description="As gestões da Loja aparecerão aqui assim que forem cadastradas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <GestaoCard key={card.term.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
