import type {
  GoogleEventSyncLink,
  GoogleSyncSourceType,
} from '../entities/google-event-sync-link.entity';

export interface IGoogleEventSyncLinkRepository {
  findBySource(
    tenantId: string,
    userId: string,
    sourceType: GoogleSyncSourceType,
    sourceId: string,
  ): Promise<GoogleEventSyncLink | null>;
  create(link: GoogleEventSyncLink): Promise<void>;
  /** Exclusão física, deliberada — o link só tem sentido enquanto o espelhamento existe. */
  delete(id: string): Promise<void>;
}
