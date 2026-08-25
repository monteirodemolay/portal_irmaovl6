import type { AccessLevel, EventKind, SessionDegree } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface Event extends BaseEntity {
  tipo: EventKind;
  titulo: string;
  descricao: string | null;
  local: string;
  dataInicio: Date;
  /** `null` = sem horário de término definido — comum em sessões da Loja que têm início mas não têm fim fixo previsto. */
  dataFim: Date | null;
  exigeConfirmacaoPresenca: boolean;
  capacidadeMaxima: number | null;
  /** Traje sugerido (ex.: "Social completo"). */
  traje: string | null;
  /** Texto livre — horário e/ou instrução de chegada (ex.: "19:30, para preparação"). */
  chegadaSugerida: string | null;
  observacoes: string | null;
  /** IDs compostos do Acervo VL6 (`kind_sourceId`, ver `archive-item-id.ts`) — nunca duplica upload. */
  arquivosRelacionados: string[];
  /**
   * Gestão vigente na data do evento — Fase 1 da Fundação do Acervo VL6
   * (docs/architecture/11-acervo-vl6.md §11.5). `null` quando ainda não
   * identificada (evento legado, ou data sem Gestão cadastrada);
   * preenchido automaticamente por `FindBoardTermForDateUseCase` quando
   * possível, nunca inferido às cegas.
   */
  boardTermId: string | null;
  /** Nível de acesso do evento — controla a visibilidade no Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5). */
  nivelAcesso: AccessLevel;
  /** Se `true`, o evento aparece na Linha do Tempo do Acervo VL6. */
  exibirNaLinhaDoTempo: boolean;
  /**
   * Grau da Sessão (Central de Comunicação, docs/architecture) — `null` pra
   * tipos de evento que não são sessão, ou sessões legadas sem essa
   * informação. Preenche automaticamente o gerador de arte, nunca exigido
   * na Agenda em si.
   */
  grau: SessionDegree | null;
}
