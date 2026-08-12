import type { MemberDegree } from '@vl6/shared';
import { cn, Compass } from '@vl6/ui';
import { MEMBER_DEGREE_LABELS, MEMBER_DEGREE_ORDINAL } from '@/lib/membership/member-degree-label';

/**
 * Selo de identificação do grau simbólico — só identifica o grau (nome +
 * numeral), sem qualquer palavra, sinal ou símbolo ritualístico. Visual
 * institucional (azul + dourado), reaproveitando os tokens já usados no
 * resto do Portal.
 */
export function MemberDegreeBadge({
  grau,
  compact = false,
  className,
}: {
  grau: MemberDegree;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'border-accent/40 bg-primary inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-white',
        className,
      )}
    >
      <Compass size={13} strokeWidth={1.75} className="text-accent shrink-0" />
      {compact
        ? MEMBER_DEGREE_LABELS[grau]
        : `${MEMBER_DEGREE_ORDINAL[grau]} — ${MEMBER_DEGREE_LABELS[grau]}`}
    </span>
  );
}
