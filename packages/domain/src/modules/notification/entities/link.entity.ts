import type { LinkAccessTypeKey, LinkCategoryKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/** "Links Úteis" — atalhos institucionais/ritualísticos exibidos na Área do Irmão. */
export interface Link extends BaseEntity {
  titulo: string;
  url: string;
  /** Texto curto exibido no cartão — `null` em links antigos criados antes deste campo existir. */
  descricao: string | null;
  icone: string | null;
  categoria: LinkCategoryKey;
  /** Interno (dentro do próprio Portal), externo (site de terceiros) ou contato (WhatsApp, e-mail...). */
  tipoAcesso: LinkAccessTypeKey;
  /** Aparece na seção "Acessos em destaque", no topo da página. */
  destaque: boolean;
  ordem: number;
}
