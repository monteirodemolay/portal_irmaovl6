import type { Ceremony, CeremonyState } from '@/modules/cripta/lib/cycle-wizard';
import type { ReactNode } from 'react';

const STATUS_LABEL: Record<CeremonyState, (ceremony: Ceremony) => string> = {
  pending: () => 'Nunca realizada',
  current: () => 'Em andamento',
  done: (ceremony) =>
    ceremony === 'inauguracao'
      ? 'Concluída — ato único já realizado'
      : 'Concluída — aguardando autorização para a próxima etapa',
};

const STATUS_STYLE: Record<CeremonyState, string> = {
  pending: 'border-[#c9b98f] bg-white text-[#8a9bb0]',
  current: 'border-[#123c69] bg-[#123c69] text-white',
  done: 'border-green-700 bg-green-50 text-green-900',
};

/** One cerimônia, one card, always visible with its own status — the "ir pra frente e voltar"
 * problem the Venerável reported, and the dead "Próximo passo" button the Projetor mock-up had,
 * both come from a single screen hiding where the OTHER cerimônias stand. Here every cerimônia
 * is always on screen; only the active one renders its working controls as children. */
export function CeremonyCard({
  id,
  title,
  badge,
  state,
  children,
}: {
  id: Ceremony;
  title: string;
  badge?: string;
  state: CeremonyState;
  children?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 ${state === 'current' ? 'border-[#c9a449] bg-[#fffaf0]' : 'border-[#e4dcc4] bg-white'}`}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-2xl text-[#142a43]">{title}</h2>
          {badge && (
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#725624]">
              {badge}
            </span>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLE[state]}`}
        >
          {STATUS_LABEL[state](id)}
        </span>
      </div>
      {state === 'current' && <div className="mt-5 space-y-5">{children}</div>}
    </section>
  );
}
