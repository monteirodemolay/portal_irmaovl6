import type { BaseEntity } from '../../../shared/base-entity';

export type CentralBlockKey =
  | 'apresentacao'
  | 'informacoesPessoais'
  | 'profissional'
  | 'empresa'
  | 'informacoesMaconicas'
  | 'competencias'
  | 'servicos'
  | 'afiliacoes'
  | 'endereco'
  | 'memoriaFotografica';

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
 * `memberId`. Só existe UMA linha desta entidade quando o próprio Irmão (ou
 * um Administrador em nome dele) mexeu na aba "Privacidade" pelo menos uma
 * vez — quem nunca tocou nisso não tem registro nenhum aqui, `null`.
 *
 * A ausência desse registro NÃO significa perfil fechado: decisão do
 * Administrador (setembro/2026) — todo Irmão nasce com o perfil publicado e
 * tudo aberto por padrão, `null` incluído, pra não ficar vazio antes de
 * alguém ter acesso ao Portal pra configurar algo. Ver
 * `resolveEffectivePublication` (única fonte da verdade pra "o que está
 * visível agora", nunca ler `blocks`/`contacts`/`externalLinks` direto sem
 * passar por ela) — `profilePublished`/suspensão só têm efeito quando ESTE
 * registro existe; sem ele, tudo é aberto.
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
