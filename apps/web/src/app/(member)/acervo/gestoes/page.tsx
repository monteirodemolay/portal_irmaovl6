import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { BoardTerm } from '@vl6/domain';
import { Avatar, AvatarFallback, CalendarDays, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

/** Único cargo com card grande (foto) na abertura de uma Gestão — mesmo recorte de `[gestaoId]/page.tsx`. */
const VENERAVEL_CARGO = 'veneravel_mestre';

function formatPeriod(inicio: Date, fim: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short' });
  return `${formatter.format(new Date(inicio))} — ${formatter.format(new Date(fim))}`;
}

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

interface GestaoCardData {
  term: BoardTerm;
  veneravelNome: string | null;
  veneravelFotoUrl: string | null;
}

/**
 * Card da listagem de Gestões — foto do Venerável Mestre em retrato (4:5)
 * com uma plaquinha de nome/período sobrepondo a base (margin negativa),
 * MESMO padrão visual do `VigilanteCard` em `[gestaoId]/page.tsx` (que por
 * sua vez já seguia o "Ex-Veneráveis" do Portal VL6 Público) — pedido
 * direto do Administrador pra manter a apresentação consistente em vez do
 * avatar circular pequeno usado antes. Sem Venerável cadastrado ainda, cai
 * num quadrado neutro com o ícone de calendário no lugar da foto.
 */
function GestaoCard({ term, veneravelNome, veneravelFotoUrl }: GestaoCardData) {
  return (
    <Link href={`/acervo/gestoes/${term.id}`} className="group">
      <div className="bg-bg border-border aspect-[4/5] overflow-hidden rounded-xl border shadow-sm">
        {veneravelFotoUrl ? (
          <img
            src={veneravelFotoUrl}
            alt={veneravelNome ?? term.nome}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {veneravelNome ? initials(veneravelNome) : <CalendarDays size={22} />}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
      <div className="bg-surface border-border hover:border-accent relative mx-3 -mt-7 rounded-lg border p-3 text-center shadow-md transition-colors">
        <div className="text-accent flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
          <CalendarDays size={12} />
          Gestão
        </div>
        <h3 className="font-display group-hover:text-accent mt-1 truncate text-sm font-semibold transition-colors">
          {term.nome}
        </h3>
        <p className="text-muted mt-0.5 text-xs">
          {formatPeriod(term.periodoInicio, term.periodoFim)}
        </p>
        {veneravelNome && (
          <p className="text-muted mt-1 truncate text-xs font-medium">{veneravelNome}</p>
        )}
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
