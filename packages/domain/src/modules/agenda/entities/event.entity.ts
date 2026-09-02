import type {
  AccessLevel,
  EventKind,
  JointLodgeReference,
  SessionAccessKind,
  SessionDegree,
  SessionType,
  SessionWorkDegree,
} from '@vl6/shared';
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
   * @deprecated Mantido só por compatibilidade com dados já gravados e
   * `SESSION_DEGREE_LABELS` — misturava grau ("aprendiz") com tipo
   * ("magna") e acesso ("publica") no mesmo enum. Todo código novo usa
   * `degreeWork` (grau dos trabalhos, sozinho). Nunca lido como fonte de
   * verdade — `create-publication-from-event.use-case.ts` prefere
   * `degreeWork`, só cai aqui pra eventos migrados antes dessa mudança.
   */
  grau: SessionDegree | null;

  /**
   * Classificação estruturada da Sessão — Tipo/Natureza/Grau dos
   * trabalhos/Acesso, cada um seu próprio campo (nunca mais misturados,
   * ver comentário de `SESSION_TYPES` em packages/shared). Todos `null`
   * pra Eventos que não são Sessão (`tipo !== 'sessao'`) e para Sessões
   * ainda não migradas/classificadas (`classificationReviewRequired`
   * sinaliza esse caso). `formatSessionName` é a única função que constrói
   * o nome de exibição a partir destes campos — nenhuma tela deve montar
   * essa string na mão.
   */
  sessionType?: SessionType | null;
  /** Chave de `SESSION_NATURES_BY_TYPE[sessionType]` — `null` junto com `sessionType`. */
  sessionNature?: string | null;
  /** Grau dos trabalhos — nunca mais junto de Tipo/Acesso (ver `grau` acima, depreciado). */
  degreeWork?: SessionWorkDegree | null;
  /** Quem pode entrar na Sessão — "Pública" mora aqui, nunca em `sessionType`. */
  access?: SessionAccessKind | null;
  /** Sessão realizada conjuntamente com outra(s) Loja(s) — `participatingLodges` só é relevante quando `true`. */
  isJointSession?: boolean;
  participatingLodges?: JointLodgeReference[];
  /**
   * Texto original (`titulo`/`grau`) antes da migração pra classificação
   * estruturada — preservado pra auditoria, nunca usado como fonte de
   * verdade depois de migrado. `null`/ausente pra Sessões cadastradas já
   * com a estrutura nova.
   */
  legacySessionType?: string | null;
  /**
   * `true` quando a migração automática (`SeedSessionClassificationUseCase`)
   * não teve informação suficiente pra inferir a classificação com
   * segurança (ex.: "Sessão Magna" genérica, "Sessão Pública" sem indicar o
   * Tipo) — nunca adivinha, marca pra revisão manual do Administrador em
   * vez de inventar Natureza/Grau/Acesso. `false`/ausente (padrão) pra toda
   * Sessão cadastrada já pela estrutura nova.
   *
   * Campos acima todos opcionais (mesmo padrão de `origemGalleryAlbumId`
   * em `ArchiveItem`) — aditivos, não exigem alterar todo `Event` literal
   * já existente em testes/fixtures/use cases.
   */
  classificationReviewRequired?: boolean;
}
