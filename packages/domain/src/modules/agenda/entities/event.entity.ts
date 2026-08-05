import type { EventKind } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface Event extends BaseEntity {
  tipo: EventKind;
  titulo: string;
  descricao: string | null;
  local: string;
  dataInicio: Date;
  dataFim: Date;
  exigeConfirmacaoPresenca: boolean;
  capacidadeMaxima: number | null;
}
