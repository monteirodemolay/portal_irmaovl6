import type {
  PublicationChannel,
  PublicationOutputFormat,
  PublicationSourceType,
  PublicationStatus,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Uma arte já gerada (PNG) num formato de saída específico — embutida em
 * `Publication.assets`, nunca uma coleção própria: sempre lida/escrita
 * junto da publicação, no máximo 4 por publicação (um por formato), longe
 * do limite de tamanho de documento do Firestore.
 */
export interface PublicationAsset {
  format: PublicationOutputFormat;
  url: string;
  mimeType: 'image/png';
  width: number;
  height: number;
  checksum: string;
  generatedAt: Date;
}

/**
 * Uma publicação em produção na Central de Comunicação — nasce de um
 * Evento da Agenda (`sourceType: 'agenda_event'`), de um Irmão aniversariante
 * (`'member'`, só com `Member.autorizaDivulgacaoExterna === true`) ou
 * manual (campanha/comunicado avulso). Nunca duplica o registro de origem:
 * `sourceId` referencia o `Event`/`Member` pelo ID canônico.
 */
export interface Publication extends BaseEntity {
  templateId: string;
  sourceType: PublicationSourceType;
  sourceId: string | null;
  title: string;
  /** Valores digitados pelo Administrador pra cada `TemplateField.key` do modelo. */
  fields: Record<string, string>;
  caption: string | null;
  whatsappText: string | null;
  channels: PublicationChannel[];
  scheduledFor: Date | null;
  /**
   * Estado do fluxo editorial (rascunho → aprovação → pronta → publicada →
   * arquivada) — chamado `publicacaoStatus`, não `status`, porque `status`
   * já é o campo de soft-delete do `BaseEntity` (mesma convenção de
   * `ArchiveItem.publicacaoStatus`, docs/architecture/11-acervo-vl6.md).
   */
  publicacaoStatus: PublicationStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  publishedBy: string | null;
  publishedAt: Date | null;
  assets: PublicationAsset[];
}
