import type { LinkSuggestionStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * "Sugerir um link" — qualquer Irmão pode indicar um acesso pra um
 * Administrador avaliar. Nunca vira um `Link` sozinha: aprovar só muda
 * `status` (registro de que a sugestão foi aceita); o Administrador ainda
 * cadastra o `Link` de verdade pela tela normal, escolhendo categoria/tipo
 * de acesso/destaque — dados que quem sugere não tem como saber.
 */
export interface LinkSuggestion extends BaseEntity {
  memberId: string;
  titulo: string;
  url: string;
  descricao: string | null;
  revisaoStatus: LinkSuggestionStatus;
  motivoRejeicao: string | null;
  revisadoPor: string | null;
  revisadoEm: Date | null;
}
