import type { ActiveBoard } from '@vl6/domain';
import Link from 'next/link';
import { MemberAvatar } from '@/components/membership/member-avatar';

/**
 * Cartão compacto de "Gestão vigente" sobreposto ao hero — mostra o nome
 * da Gestão e o Venerável Mestre em exercício (achado via `cargo ===
 * 'veneravel_mestre'` na diretoria ativa), com a foto do perfil dele
 * (mesmo `MemberAvatar` do topbar — fallback em cascata: foto → iniciais
 * → ícone), sempre com dados reais de `GetActiveBoardUseCase`. Sem gestão
 * cadastrada, o bloco inteiro some (nunca mostra um card vazio).
 */
export function GovernanceHighlightCard({ board }: { board: ActiveBoard | null }) {
  if (!board) return null;

  const veneravel = board.seats.find((seat) => seat.assignment.cargo === 'veneravel_mestre');

  return (
    <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 p-4">
      <div className="flex items-stretch gap-3">
        {veneravel && (
          <MemberAvatar
            fotoUrl={veneravel.member.fotoUrl}
            nome={veneravel.member.nomeCompleto}
            className="h-24 w-24 shrink-0 rounded-xl ring-1 ring-white/20"
            imgClassName="object-top"
          />
        )}
        {/* Coluna da direita: rótulo da Gestão em cima, "Venerável Mestre" +
            nome no meio, botão embaixo — tudo distribuído na altura do
            card, ao lado da foto (em vez de foto pequena + texto numa
            única linha estreita). */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="min-w-0 leading-tight">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
              {board.term.nome}
            </p>
            {veneravel && (
              <>
                <p className="text-accent mt-1.5 text-[10px] font-semibold uppercase tracking-wide">
                  Venerável Mestre
                </p>
                <p className="font-display truncate text-base font-semibold text-white">
                  {veneravel.member.nomeCompleto}
                </p>
              </>
            )}
          </div>
          <Link
            href={`/acervo/gestoes/${board.term.id}`}
            className="bg-accent text-primary-dark mt-3 inline-block w-fit rounded-full px-4 py-2 text-xs font-bold"
          >
            Ver Gestão →
          </Link>
        </div>
      </div>
    </div>
  );
}
