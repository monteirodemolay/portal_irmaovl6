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

  areaAtuacao: string | null;
  formacao: string | null;
  resumoProfissional: string | null;

  negocios: CentralBusinessEntry[];

  lojasVisitadas: string | null;
  interessesMaconicos: string | null;

  externalLinks: CentralExternalLinks;
}
