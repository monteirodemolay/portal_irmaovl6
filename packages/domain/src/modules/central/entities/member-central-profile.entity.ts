import type { AreaAtuacaoKey, BusinessPublicationStatus, FormaAtendimentoKey } from '@vl6/shared';
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
   * Nunca vem do formulário do Irmão — sempre computado por
   * `UpdateCentralProfileUseCase` (novo/alterado vira `pending_review`) ou
   * por `ReviewBusinessSubmissionUseCase` (decisão da Administração).
   */
  status: BusinessPublicationStatus;
  /** Data da última alteração de conteúdo OU decisão de revisão, o que for mais recente. */
  updatedAt: Date;
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

  lojasVisitadas: string | null;
  interessesMaconicos: string | null;

  externalLinks: CentralExternalLinks;
}
