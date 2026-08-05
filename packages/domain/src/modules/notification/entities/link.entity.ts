import type { BaseEntity } from '../../../shared/base-entity';

/** "Links Úteis" — atalhos institucionais/ritualísticos exibidos na Área do Irmão. */
export interface Link extends BaseEntity {
  titulo: string;
  url: string;
  icone: string | null;
  categoria: string;
  ordem: number;
}
