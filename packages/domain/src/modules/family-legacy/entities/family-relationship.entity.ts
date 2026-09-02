import type {
  FamilyChildRole,
  FamilyConfirmationStatus,
  FamilyParentRole,
  FamilyPersonRefKind,
  FamilyRelationKind,
  FamilyReviewStatus,
  FamilySourceKind,
  FamilyVisibilityLevel,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface FamilyPersonRef {
  kind: FamilyPersonRefKind;
  id: string;
}

/**
 * Aresta direta ou vínculo declarado entre duas pessoas (`member` ou
 * `familyPerson`). Nunca copia nome/biografia — só referências tipadas.
 * Parentescos como avô, tio, sogro ou primo NÃO são gravados aqui: são
 * derivados em tempo de leitura pela cadeia de `parent_of`/`spouse_of`/
 * `sibling_of` (ver `deriveKinships`).
 */
export interface FamilyRelationship extends BaseEntity {
  fromKind: FamilyPersonRefKind;
  fromId: string;
  toKind: FamilyPersonRefKind;
  toId: string;
  relationKind: FamilyRelationKind;
  parentRole: FamilyParentRole | null;
  childRole: FamilyChildRole | null;
  declaredLabel: string | null;
  /** Lado da linhagem que esta aresta inaugura, quando aplicável (`parentRole` mãe/pai). */
  lineageSide: 'maternal' | 'paternal' | 'both' | 'unknown';
  confirmationStatus: FamilyConfirmationStatus;
  confirmedAt: Date | null;
  confirmedBy: string | null;
  confirmationNote: string | null;
  visibility: FamilyVisibilityLevel;
  reviewStatus: FamilyReviewStatus;
  sourceKind: FamilySourceKind;
  sourceDescription: string | null;
  validFrom: Date | null;
  validTo: Date | null;
}
