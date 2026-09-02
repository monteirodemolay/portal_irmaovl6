import type {
  FamilyReviewStatus,
  FamilySourceKind,
  FamilyVisibilityLevel,
  PersonFraternalLinkStatus,
  PersonLifeStatus,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Familiar sem cadastro de `Member` — histórico, externo ou sem acesso ao
 * Portal. Nunca é promovido a `Member` (Decisão não-negociável do pacote de
 * implantação). `linkedMemberId` só existe para uma fusão futura assistida
 * (Etapa 8) quando se descobre que a pessoa registrada aqui é, na verdade,
 * um Irmão já cadastrado — nunca preenchido automaticamente por este módulo.
 */
export interface FamilyPerson extends BaseEntity {
  linkedMemberId: string | null;
  nomeCompleto: string;
  /** Nome normalizado (minúsculo, sem acento) para busca de deduplicação — ver `normalizeNameForSearch`. */
  nomeBusca: string;
  fotoUrl: string | null;
  dataNascimento: Date | null;
  dataFalecimento: Date | null;
  lifeStatus: PersonLifeStatus;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  biografia: string | null;
  menorDeIdade: boolean;
  /** Nunca deduzido pelo parentesco — sempre uma resposta explícita de quem cadastrou. */
  fraternalLinkStatus: PersonFraternalLinkStatus;
  visibility: FamilyVisibilityLevel;
  reviewStatus: FamilyReviewStatus;
  sourceKind: FamilySourceKind;
  sourceDescription: string | null;
  /** `Member` responsável pelo cadastro — não é necessariamente parte de toda relação da pessoa, mas criou o registro. */
  managedByMemberId: string;
}
