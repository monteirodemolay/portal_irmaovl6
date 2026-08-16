import type { ArchiveContributionStatus, ArchiveContributionTypeKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Envio de um Irmão para o Acervo (Estágio 8, §11.6g) — fica em quarentena
 * até um Administrador aprovar ou rejeitar. Aprovar não cria
 * automaticamente um `FileAsset`/`GalleryMedia`; incorporar ao Acervo
 * formal continua uma ação manual do Administrador pelos fluxos já
 * existentes, mantendo a escrita nas coleções canônicas exclusivamente
 * administrativa.
 */
export interface ArchiveContribution extends BaseEntity {
  memberId: string;
  titulo: string;
  descricao: string;
  tipo: ArchiveContributionTypeKey;
  arquivoUrl: string | null;
  tamanhoBytes: number | null;
  moderacaoStatus: ArchiveContributionStatus;
  motivoRejeicao: string | null;
  moderadoPor: string | null;
  moderadoEm: Date | null;
}
