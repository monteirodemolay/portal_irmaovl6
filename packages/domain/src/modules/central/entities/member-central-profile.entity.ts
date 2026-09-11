import type {
  AffiliationAbrangenciaKey,
  AreaAtuacaoKey,
  BusinessPublicationStatus,
  FormaAtendimentoKey,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface CentralBusinessEntry {
  id: string;
  nomeEmpresa: string;
  segmento: string | null;
  cargo: string | null;
  descricao: string | null;
  cidade: string | null;
  telefoneComercial: string | null;
  siteUrl: string | null;
  cnpj: string | null;
  logoUrl: string | null;
  produtosServicos: string[];
  whatsappComercial: string | null;
  emailComercial: string | null;
  instagramComercial: string | null;
  formasAtendimento: FormaAtendimentoKey[];
  horarioFuncionamento: string | null;
  ofereceDescontoIrmaos: boolean;
  descontoDescricao: string | null;
  /**
   * Marca esta empresa/negócio como o "Principal" entre os cadastrados —
   * preferência de exibição do próprio Irmão (aparece em destaque no
   * cabeçalho do perfil), nunca participa da revisão da Administração.
   * Opcional/aditivo — ausente/`undefined` equivale a `false`; no máximo
   * uma entrada é Principal por vez (reforçado na tela de edição).
   */
  principal?: boolean;
  /**
   * Nunca vem do formulário do Irmão — sempre computado por
   * `UpdateCentralProfileUseCase` (novo/alterado vira `pending_review`) ou
   * por `ReviewBusinessSubmissionUseCase` (decisão da Administração).
   */
  status: BusinessPublicationStatus;
  /** Data da última alteração de conteúdo OU decisão de revisão, o que for mais recente. */
  updatedAt: Date;
}

/**
 * Vínculo com Associação, Instituição ou organização sem fins lucrativos —
 * nacional ou internacional. Sem moderação da Administração (não é canal
 * comercial, mesmo espírito de `competencias`/`servicos`/`externalLinks`: o
 * Irmão é responsável pelo que declara), por isso sem `status`/`updatedAt`
 * por entrada — nada a reconciliar.
 */
export interface CentralAffiliationEntry {
  id: string;
  nomeInstituicao: string;
  /** Papel do Irmão na instituição — texto curto livre (ex.: "Membro", "Diretor"). */
  papel: string | null;
  abrangencia: AffiliationAbrangenciaKey | null;
  /** Mais relevante quando `abrangencia === 'internacional'`, mas sempre disponível. */
  pais: string | null;
  descricao: string | null;
  siteUrl: string | null;
  instagram: string | null;
  /** Opcional — sobe pro Blob igual `CentralBusinessEntry.logoUrl`, nunca obrigatório. */
  logoUrl: string | null;
}

export interface CentralExternalLinks {
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  lattes: string | null;
  site: string | null;
}

/**
 * Complemento opcional e voluntário do cadastro de Irmão — Central dos
 * Irmãos VL6 (docs/architecture). 1:1 com `Member` por `memberId`, entidade
 * separada (não subobjeto de `Member`) de propósito: mantém `member:*`
 * (RBAC do cadastro administrativo) e `memberCentral:*` (RBAC do
 * autoatendimento voluntário) em domínios de permissão distintos — um
 * Administrador editando o cadastro básico via `UpdateMemberUseCase` nunca
 * toca nestes campos. Todo campo nasce nulo/vazio: cadastrar aqui nunca
 * implica publicar (ver `PublicationSettings`, que controla visibilidade).
 * Contatos (telefone/WhatsApp/e-mail) não duplicam `Member` — a Central só
 * controla se cada um é exibido a terceiros.
 */
export interface MemberCentralProfile extends BaseEntity {
  memberId: string;

  apresentacao: string | null;

  interesses: string | null;
  cidadeExibicao: string | null;

  /** Taxonomia fechada (`AREA_ATUACAO_KEYS`) — `null` = não informado. */
  areaAtuacao: AreaAtuacaoKey | null;
  /** Texto livre, só usado quando `areaAtuacao === 'outra'`. */
  areaAtuacaoOutra: string | null;
  formacao: string | null;
  resumoProfissional: string | null;

  negocios: CentralBusinessEntry[];

  /** Tags curtas — máx. 10 cada (`memberCentralProfileSchema`). */
  competencias: string[];
  servicos: string[];

  /** Vínculos com Associações/Instituições/organizações sem fins lucrativos — sem moderação. */
  afiliacoes: CentralAffiliationEntry[];

  lojasVisitadas: string | null;
  interessesMaconicos: string | null;

  externalLinks: CentralExternalLinks;
}
