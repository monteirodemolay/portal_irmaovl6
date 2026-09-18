import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Um cargo institucional de uma `ParamasonicEntity`, cadastrado pela
 * Administração conforme a estrutura de cada entidade vai sendo levantada
 * (a Loja ainda não tem o quadro completo de cargos de DeMolay, Filhas de Jó
 * etc.). Uma vez cadastrado, o nome fica fixo e reaproveitável — o campo
 * `cargo` de `ParamasonicEntityMember` continua sendo um texto simples
 * (nunca uma referência a este registro), então remover um cargo daqui
 * nunca altera o histórico de quem já foi cadastrado com ele.
 */
export interface ParamasonicEntityPosition extends BaseEntity {
  entityId: string;
  nome: string;
}
