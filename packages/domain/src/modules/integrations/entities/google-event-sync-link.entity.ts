import type { BaseEntity } from '../../../shared/base-entity';

export type GoogleSyncSourceType = 'vl6' | 'personal';

/** Vincula um `Event`/`PersonalEvent` local ao evento espelhado no Google Agenda. */
export interface GoogleEventSyncLink extends BaseEntity {
  userId: string;
  sourceType: GoogleSyncSourceType;
  sourceId: string;
  googleEventId: string;
}
