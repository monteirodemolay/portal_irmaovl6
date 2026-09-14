import type { MaritalStatus, MemberDegree, MemberSituationStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';
import type { Address } from '../../../shared/address';

export interface SocialLinks {
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
}

/**
 * Filho(a) do Irmão, pra fins de lembrete de aniversário — sem data completa
 * (a fonte institucional, quando existe, só traz dia/mês, nunca o ano) e sem
 * criar um cadastro de pessoa à parte: isso é só uma lista de lembretes no
 * `Member` dos pais, não um vínculo de parentesco completo (ver módulo
 * Família e Legado pra isso).
 */
export interface MemberChild {
  id: string;
  nome: string;
  aniversarioDia: number;
  aniversarioMes: number;
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
  /**
   * Fallback de dia/mês do próprio aniversário do Irmão, usado só quando
   * `dataNascimento` é `null` (fonte institucional que não traz o ano) —
   * mesmo papel de `conjugeAniversarioDia`/`conjugeAniversarioMes` abaixo,
   * só que pro próprio Irmão. Campo aditivo opcional — cadastros já
   * existentes não precisam ser migrados pra ganhar `undefined`/`null`
   * aqui. Nunca usado pra calcular idade.
   */
  aniversarioDia?: number | null;
  aniversarioMes?: number | null;
  dataIniciacao: Date | null;
  dataElevacao: Date | null;
  dataExaltacao: Date | null;
  /** Identificador único do Irmão na Loja. */
  cim: string | null;
  grau: MemberDegree;
  cargoAtualId: string | null;
  /** Espelho do registro vigente de `MemberSituationRecord` — nunca editar direto, sempre via `RegisterMemberSituationUseCase`. */
  situacao: MemberSituationStatus;
  /**
   * Espelho de `MemberSituationRecord.dataInicio` do registro vigente
   * quando `situacao === 'falecido'` — mesmo padrão de `situacao` acima,
   * mantido por `RegisterMemberSituationUseCase`, nunca editado direto.
   * `null` em qualquer outra situação.
   */
  dataFalecimento: Date | null;
  /**
   * Mensagem de homenagem exibida na página In Memoriam do perfil público —
   * só existe quando `situacao === 'falecido'`, e só o Administrador edita
   * (`UpdateMemberMemorialMessageUseCase`, `member:update`). Distinta de
   * `biografia` (escrita pelo próprio Irmão em vida).
   */
  mensagemHomenagem: string | null;
  lojaId: string;
  potencia: string;
  profissao: string | null;
  empresa: string | null;
  estadoCivil: MaritalStatus | null;
  /** Só faz sentido quando `estadoCivil` implica cônjuge — ver `MARITAL_STATUSES_WITH_SPOUSE`. */
  conjugeNome: string | null;
  conjugeDataNascimento: Date | null;
  /**
   * Data completa do casamento, quando conhecida — só uso interno da
   * Secretaria (mesmo tratamento de `conjugeNome`/`conjugeDataNascimento`),
   * nunca aparece no Diretório. Campo aditivo opcional, mesmo motivo de
   * `aniversarioDia` acima.
   */
  dataCasamento?: Date | null;
  /**
   * Fallback de dia/mês do aniversário do cônjuge, usado só quando
   * `conjugeDataNascimento` é `null` (fonte institucional que não traz o
   * ano) — `ListUpcomingAnniversariesUseCase` prioriza a data completa
   * quando existe (o Irmão preencheu o ano em Meu Espaço) e só cai aqui pra
   * não perder o lembrete quando só o dia/mês são conhecidos. Nunca usado
   * pra calcular idade.
   */
  conjugeAniversarioDia: number | null;
  conjugeAniversarioMes: number | null;
  /** Lembretes de aniversário dos filhos — ver `MemberChild`. */
  filhos: MemberChild[];
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
