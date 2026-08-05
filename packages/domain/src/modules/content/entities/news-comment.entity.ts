import type { BaseEntity } from '../../../shared/base-entity';

/** `moderado = false` até um `news:manage` aprovar — reprovar é soft delete. */
export interface NewsComment extends BaseEntity {
  newsId: string;
  autorId: string;
  texto: string;
  moderado: boolean;
}
