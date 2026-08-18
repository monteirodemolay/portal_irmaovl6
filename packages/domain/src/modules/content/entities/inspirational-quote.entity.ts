import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Frase inspiracional exibida no Início ("frase do dia"). Autoria livre —
 * pode ser de um pensador reconhecido, provérbio maçônico ou citação de um
 * Irmão da própria Loja. `ativa` controla se entra no sorteio/rotação sem
 * precisar excluir o registro (mesmo padrão de `Announcement.publicado`).
 */
export interface InspirationalQuote extends BaseEntity {
  texto: string;
  autor: string;
  ativa: boolean;
}
