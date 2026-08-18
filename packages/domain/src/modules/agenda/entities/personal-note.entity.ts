import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Anotação privada do Irmão — pode ser avulsa (aparece só na barra lateral
 * "Minhas anotações") ou vinculada a um evento específico de qualquer
 * origem (`eventoOrigem`+`eventoId`), exibida no painel de detalhes daquele
 * evento. Nunca é lida por ninguém além do próprio dono.
 */
export interface PersonalNote extends BaseEntity {
  userId: string;
  texto: string;
  fixada: boolean;
  eventoOrigem: 'vl6' | 'personal' | 'google' | null;
  eventoId: string | null;
}
