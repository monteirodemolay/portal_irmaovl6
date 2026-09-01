import type { MaritalStatus, MemberDegree, MemberSituationStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';
import type { Address } from '../../../shared/address';

export interface SocialLinks {
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
}

/** Cadastro de Irmão — docs/architecture/03-modelo-dados.md. */
export interface Member extends BaseEntity {
  userId: string | null;
  nomeCompleto: string;
  fotoUrl: string | null;
  /** Opcional no cadastro — Irmãos importados em massa podem não ter e-mail ainda; ver `ClaimMemberAccountUseCase`. */
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: Address | null;
  dataNascimento: Date | null;
  dataIniciacao: Date | null;
  dataElevacao: Date | null;
  dataExaltacao: Date | null;
  /** Identificador único do Irmão na Loja. */
  cim: string | null;
  grau: MemberDegree;
  cargoAtualId: string | null;
  /** Espelho do registro vigente de `MemberSituationRecord` — nunca editar direto, sempre via `RegisterMemberSituationUseCase`. */
  situacao: MemberSituationStatus;
  lojaId: string;
  potencia: string;
  profissao: string | null;
  empresa: string | null;
  estadoCivil: MaritalStatus | null;
  /** Só faz sentido quando `estadoCivil` implica cônjuge — ver `MARITAL_STATUSES_WITH_SPOUSE`. */
  conjugeNome: string | null;
  conjugeDataNascimento: Date | null;
  biografia: string | null;
  redesSociais: SocialLinks;
  observacoes: string | null;
  /**
   * Consentimento pra publicação EXTERNA (Instagram/WhatsApp) via Central de
   * Comunicação — distinto de `PublicationSettings.profilePublished`
   * (Diretório interno, módulo `central`). Opt-in, nunca opt-out.
   */
  autorizaDivulgacaoExterna: boolean;
}
