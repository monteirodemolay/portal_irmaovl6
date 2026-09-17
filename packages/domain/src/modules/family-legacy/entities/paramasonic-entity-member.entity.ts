import type {
  ParamasonicEntityMemberCategory,
  ParamasonicEntityMemberSituation,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Um integrante do corpo próprio de uma `ParamasonicEntity` — DeMolay,
 * Filhas de Jó, Castelo, Abelhinhas etc. têm pessoas que nunca são `Member`
 * da Loja (jovens, familiares); a Fraternidade Feminina só tem esse tipo de
 * integrante. `memberId` cobre o caso oposto: um Irmão cadastrado que já
 * ocupou ou ocupa um cargo institucional numa dessas entidades — mesma
 * exclusão mútua de `Honor.memberId`/`homenageadoNome` (nunca os dois
 * preenchidos, nunca os dois vazios).
 *
 * `cargo` é texto livre — a Loja ainda não tem a estrutura completa de
 * cargos de cada entidade paramaçônica levantada, então nunca trava num
 * enum fechado (mesmo espírito de `PersonFraternalRecord.cargos`).
 */
export interface ParamasonicEntityMember extends BaseEntity {
  entityId: string;
  /** Preenchido quando o integrante é um Irmão cadastrado (`nomeCompleto`/`contato` ficam `null` nesse caso). */
  memberId: string | null;
  nomeCompleto: string | null;
  contato: string | null;
  /** Texto livre — ex.: "Presidência", "Secretaria", ou `null` pra integrante sem cargo. */
  cargo: string | null;
  /**
   * Classificação institucional (Escudeiro, DeMolay Ativo, Cavaleiro, Sênior
   * DeMolay, Maçom/Conselho Consultivo, Clube de Mães e Amigos…). `null`
   * quando ainda não classificado — cadastro histórico aguardando revisão
   * manual do Administrador.
   */
  categoria: ParamasonicEntityMemberCategory | null;
  situacao: ParamasonicEntityMemberSituation;
  dataIngresso: Date | null;
}
