import type { MemberSituationStatus } from '@vl6/shared';
import { MEMBER_SITUATION_STATUS_LABELS } from '@vl6/shared';
import { Badge } from '@vl6/ui';

const SITUACAO_VARIANT: Record<
  MemberSituationStatus,
  'default' | 'success' | 'warning' | 'destructive'
> = {
  ativo: 'success',
  licenciado: 'warning',
  suspenso: 'warning',
  desligado: 'default',
  falecido: 'destructive',
};

export function SituacaoBadge({ situacao }: { situacao: MemberSituationStatus }) {
  return (
    <Badge variant={SITUACAO_VARIANT[situacao]}>{MEMBER_SITUATION_STATUS_LABELS[situacao]}</Badge>
  );
}
