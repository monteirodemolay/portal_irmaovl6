import type { MemberDegree } from '@vl6/shared';
import { cn, Compass } from '@vl6/ui';
import { MEMBER_DEGREE_ORDINAL } from '@/lib/membership/member-degree-label';

/** Nome curto do grau, sem o sufixo "Maçom" — só o selo usa esta forma simplificada. */
const DEGREE_SHORT_LABELS: Record<MemberDegree, string> = {
  aprendiz: 'Aprendiz',
  companheiro: 'Companheiro',
  mestre: 'Mestre',
};

/** Prata (Aprendiz) → Bronze (Companheiro) → Ouro (Mestre) — a mesma progressão metálica do grau simbólico. */
const DEGREE_STYLES: Record<MemberDegree, string> = {
  aprendiz: 'border-slate-300 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900',
  companheiro: 'border-orange-900/40 bg-gradient-to-br from-amber-700 to-orange-900 text-white',
  mestre: 'border-amber-300/60 bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950',
};

const SIZE_STYLES = {
  sm: { wrapper: 'gap-1.5 px-3 py-1 text-xs', icon: 13 },
  xs: { wrapper: 'gap-1 px-1.5 py-0.5 text-[10px]', icon: 10 },
} as const;

/**
 * Selo de identificação do grau simbólico — só identifica o grau (nome +
 * numeral), sem qualquer palavra, sinal ou símbolo ritualístico. Cor muda
 * por grau (prata/bronze/ouro), reforçando a progressão visualmente.
 */
export function MemberDegreeBadge({
  grau,
  compact = false,
  size = 'sm',
  className,
}: {
  grau: MemberDegree;
  compact?: boolean;
  /** `xs` cabe em espaços apertados (ex.: entre o nome e o cargo no topbar). */
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}) {
  const { wrapper, icon } = SIZE_STYLES[size];
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border font-semibold shadow-sm',
        wrapper,
        DEGREE_STYLES[grau],
        className,
      )}
    >
      <Compass size={icon} strokeWidth={1.75} className="shrink-0" />
      {compact
        ? DEGREE_SHORT_LABELS[grau]
        : `${MEMBER_DEGREE_ORDINAL[grau]} — ${DEGREE_SHORT_LABELS[grau]}`}
    </span>
  );
}
