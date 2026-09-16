import type { FraternalAffiliationKind, ParamasonicEntityStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Módulos habilitados de uma `ParamasonicEntity` — controla o que aparece na
 * página própria dela (Fase 1 só cadastra o flag; a habilitação efetiva do
 * módulo é implementada nas fases seguintes: Integrantes/Diretoria,
 * Agenda, Avisos e Acervo, Página informativa pública).
 */
export interface ParamasonicEntityModules {
  people: boolean;
  agenda: boolean;
  content: boolean;
  publicPage: boolean;
}

/**
 * Uma organização paramaçônica com página própria dentro do Portal — DeMolay,
 * Filhas de Jó, Fraternidade Feminina, Castelo, Abelhinhas ou outra,
 * cadastrada e gerida pela Administração da Loja (docs/architecture/12).
 * Diferente de `PersonFraternalRecord` (o vínculo PESSOAL de um Irmão ou
 * familiar com uma organização): `ParamasonicEntity` é a organização em si,
 * fonte única de verdade do nome/situação/identidade visual usados em toda
 * referência a ela (cards da Comunidade Paramaçônica, filtros de vínculo,
 * futura Agenda/Acervo/Avisos por entidade).
 *
 * Nasce isolada (nenhum integrante ou documento visível) até o gestor
 * configurar os acessos — mesmo espírito de "nunca inventa dado" já seguido
 * no resto do Portal: uma entidade sem módulos habilitados simplesmente não
 * aparece nas telas desses módulos.
 */
export interface ParamasonicEntity extends BaseEntity {
  kind: Exclude<FraternalAffiliationKind, 'mason'>;
  /** Nome oficial (ex.: "Capítulo Guardiões da Vigilância"). */
  name: string;
  /** Nome curto pra cards/emblemas (ex.: "DeMolays"). */
  shortName: string;
  /** Número/identificação institucional (ex.: nº do Capítulo/Bethel) — opcional. */
  unitNumber: string | null;
  /** Entidade responsável — normalmente o nome da própria Loja, editável. */
  parentUnitName: string;
  /** Situação institucional (ativa/em implantação/inativa) — não confundir com `status` do `BaseEntity` (ciclo de vida do registro). */
  situacao: ParamasonicEntityStatus;
  crestUrl: string | null;
  logoUrl: string | null;
  modules: ParamasonicEntityModules;
  /** `User.uid` dos gestores autorizados a administrar esta entidade (além da Administração da Loja, que sempre tem acesso). */
  managerUserIds: string[];
}
