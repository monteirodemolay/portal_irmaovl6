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
  /** Traje sugerido (ex.: "Social completo"). */
  traje: string | null;
  /** Texto livre — horário e/ou instrução de chegada (ex.: "19:30, para preparação"). */
  chegadaSugerida: string | null;
  observacoes: string | null;
  /** IDs compostos do Acervo VL6 (`kind_sourceId`, ver `archive-item-id.ts`) — nunca duplica upload. */
  arquivosRelacionados: string[];
}
