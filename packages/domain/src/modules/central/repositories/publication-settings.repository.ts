import type { PublicationSettings } from '../entities/publication-settings.entity';

export interface PublishedMemberRef {
  memberId: string;
}

export interface IPublicationSettingsRepository {
  findById(id: string): Promise<PublicationSettings | null>;
  findByMemberId(tenantId: string, memberId: string): Promise<PublicationSettings | null>;
  /** Só `memberId`s com `profilePublished === true` e sem suspensão — base do diretório/busca. */
  listPublishedByTenant(tenantId: string): Promise<PublishedMemberRef[]>;
  /** Total de perfis publicados (mesmo recorte de `listPublishedByTenant`) — usado pelo Painel administrativo. */
  countPublishedByTenant(tenantId: string): Promise<number>;
  listByTenant(tenantId: string): Promise<PublicationSettings[]>;
  create(settings: PublicationSettings): Promise<void>;
  update(settings: PublicationSettings): Promise<void>;
}
