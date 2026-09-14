import type { MemberTitleKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Título ou Condição Maçônica formalmente reconhecida (Mestre Instalado,
 * Benfeitor, Membro Honorário, Membro Remido, Fundador…) — levantamento
 * institucional do Administrador §2. Um Irmão pode acumular vários (ex.:
 * Mestre Instalado E Benfeitor), por isso é um registro próprio, não um
 * campo em `Member`. Nunca é o registro de uma Honraria/Condecoração
 * específica com diploma/ato/motivo — isso é `Honor`; aqui é só o
 * reconhecimento formal da condição em si.
 */
export interface MemberTitle extends BaseEntity {
  memberId: string;
  titulo: MemberTitleKey;
  /** Só preenchido quando `titulo === 'outro'` — nome livre do título. */
  tituloOutro: string | null;
  /** Quando conhecida — o levantamento admite título sem data precisa. */
  dataConcessao: Date | null;
  /** Referência documental (ata, decreto, resolução) que fundamenta o título. */
  fundamento: string | null;
}
