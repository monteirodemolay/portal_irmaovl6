import type {
  FamilyPersonRefKind,
  FamilyReviewStatus,
  FamilySourceKind,
  FamilyVisibilityLevel,
  FraternalAffiliationKind,
  FraternalUnitKind,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Uma trajetória maçônica ou paramaçônica de uma pessoa (`member` ou
 * `familyPerson`) — opcional e independente do parentesco. Uma mesma pessoa
 * pode ter múltiplos registros (ex.: Loja + Capítulo DeMolay), cada um com
 * sua própria fonte e revisão; nenhum é deduzido a partir de parentesco.
 */
export interface PersonFraternalRecord extends BaseEntity {
  personKind: FamilyPersonRefKind;
  personId: string;
  affiliationKind: FraternalAffiliationKind;
  organizacaoNome: string | null;
  unidadeTipo: FraternalUnitKind;
  unidadeNome: string | null;
  unidadeNumero: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  potencia: string | null;
  rito: string | null;
  dataIniciacao: Date | null;
  dataElevacao: Date | null;
  dataExaltacao: Date | null;
  grau: string | null;
  cargos: string[];
  titulos: string[];
  passouAoOrienteEternoEm: Date | null;
  resumoLegado: string | null;
  visibility: FamilyVisibilityLevel;
  reviewStatus: FamilyReviewStatus;
  sourceKind: FamilySourceKind;
  sourceDescription: string | null;
}
