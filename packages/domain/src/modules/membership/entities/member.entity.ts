import type { MaritalStatus, MemberDegree, MemberSituation } from '@vl6/shared';
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
  nomeMaconico: string | null;
  fotoUrl: string | null;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  endereco: Address | null;
  dataNascimento: Date | null;
  dataIniciacao: Date | null;
  dataElevacao: Date | null;
  dataExaltacao: Date | null;
  cim: string | null;
  matricula: string | null;
  grau: MemberDegree;
  cargoAtualId: string | null;
  situacao: MemberSituation;
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
}
