import type { BaseEntity } from '../../../shared/base-entity';

export type CentralBlockKey =
  | 'apresentacao'
  | 'informacoesPessoais'
  | 'profissional'
  | 'empresa'
  | 'informacoesMaconicas'
  | 'competencias'
  | 'servicos';

export interface CentralContactVisibility {
  telefone: boolean;
  whatsapp: boolean;
  email: boolean;
}

export interface CentralExternalLinksVisibility {
  whatsapp: boolean;
  instagram: boolean;
  facebook: boolean;
  linkedin: boolean;
  lattes: boolean;
  site: boolean;
}

/**
 * Visibilidade granular do conteúdo de `MemberCentralProfile` — 1:1 por
 * `memberId`. Toda entrada nasce `false` ("cadastrar ≠ publicar", princípio
 * central da Central dos Irmãos VL6). `profilePublished` é a chave-mestra:
 * só com ela em `true` (e sem suspensão administrativa ativa) o perfil
 * aparece no diretório/busca — os blocos individuais controlam o que
 * aparece DENTRO do perfil já publicado.
 */
export interface PublicationSettings extends BaseEntity {
  memberId: string;

  profilePublished: boolean;

  blocks: Record<CentralBlockKey, boolean>;
  contacts: CentralContactVisibility;
  externalLinks: CentralExternalLinksVisibility;

  /**
   * Suspensão administrativa (moderação) — nunca setada pelo titular.
   * Congela a exibição sem apagar a configuração do Irmão: reativar não
   * exige reconfigurar nada. Um Administrador nunca pode setar
   * `profilePublished`/`blocks`/`contacts`/`externalLinks` — só estes 3
   * campos (reforçado no Use Case e na Security Rule).
   */
  suspendedAt: Date | null;
  suspendedBy: string | null;
  suspendedReason: string | null;
}

export function isCentralProfileVisible(
  settings: PublicationSettings | null,
): settings is PublicationSettings {
  return settings !== null && settings.profilePublished && settings.suspendedAt === null;
}
