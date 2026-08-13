import type {
  CentralBlockKey,
  CentralContactVisibility,
  CentralExternalLinksVisibility,
} from './publication-settings.entity';

export type ConsentAction = 'grant' | 'revoke';

/**
 * Registro append-only de consentimento — mesma natureza de `AuditLog`
 * (imutável, sem `update`/`delete`, sem soft delete): nunca sobrescreve um
 * aceite anterior, cada mudança de publicação gera um novo registro. É o
 * log jurídico de POR QUE algo está publicado (qual aceite autorizou);
 * `PublicationSettings` é o estado ATUAL (o que está publicado agora).
 * `blocksAuthorized`/campos são exatamente o que o titular selecionou
 * naquele aceite — nunca "autorizo tudo" (docs/architecture, Central VL6).
 */
export interface PublicationConsent {
  readonly id: string;
  readonly tenantId: string;
  readonly memberId: string;
  readonly termoVersao: string;
  readonly acceptedAt: Date;
  readonly action: ConsentAction;
  readonly blocksAuthorized: CentralBlockKey[];
  readonly contactsAuthorized: Array<keyof CentralContactVisibility>;
  readonly externalLinksAuthorized: Array<keyof CentralExternalLinksVisibility>;
}
