import type { PublicationConsent } from '../entities/publication-consent.entity';

export interface IPublicationConsentRepository {
  /** Histórico completo por Irmão, mais recente primeiro — nunca update/delete, só append. */
  listByMemberId(tenantId: string, memberId: string): Promise<PublicationConsent[]>;
  append(consent: PublicationConsent): Promise<void>;
}
