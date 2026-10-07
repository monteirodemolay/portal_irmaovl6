import type { BaseEntity } from '../../../shared/base-entity';

export type AnnouncementPriority = 'baixa' | 'media' | 'alta';

export interface Announcement extends BaseEntity {
  /** Acontecimento compartilhado pela notícia e pelo acervo; legado sem vínculo. */
  eventId?: string | null;
  titulo: string;
  descricao: string;
  prioridade: AnnouncementPriority;
  publicado: boolean;
  destacar: boolean;
  dataPublicacao: Date | null;
  dataExpiracao: Date | null;
  /** Central de Avisos — cada notificação disparada na publicação exige ciência do destinatário. */
  requiresAcknowledgement: boolean;
}
