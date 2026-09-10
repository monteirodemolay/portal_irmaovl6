import type { ActiveBoard } from '@vl6/domain';
import Link from 'next/link';

/**
 * Cartão compacto de "Gestão vigente" sobreposto ao hero — mostra o nome
 * da Gestão e o Venerável Mestre em exercício (achado via `cargo ===
 * 'veneravel_mestre'` na diretoria ativa), sempre com dados reais de
 * `GetActiveBoardUseCase`. Sem gestão cadastrada, o bloco inteiro some
 * (nunca mostra um card vazio).
 */
export function GovernanceHighlightCard({ board }: { board: ActiveBoard | null }) {
  if (!board) return null;

  const veneravel = board.seats.find((seat) => seat.assignment.cargo === 'veneravel_mestre');

  return (
    <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 p-4">
      <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
        {board.term.nome}
      </p>
      {veneravel && (
        <p className="font-display mt-1 truncate text-lg font-semibold text-white">
          V∴M∴ {veneravel.member.nomeCompleto}
        </p>
      )}
      <Link
        href={`/acervo/gestoes/${board.term.id}`}
        className="bg-accent text-primary-dark mt-3 inline-block rounded-full px-4 py-2 text-xs font-bold"
      >
        Ver Gestão →
      </Link>
    </div>
  );
}
