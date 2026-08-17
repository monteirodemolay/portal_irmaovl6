import type { AuthContext } from '../../../shared/auth-context';
import type { ITokenCipher } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { GoogleSyncSourceType } from '../entities/google-event-sync-link.entity';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleEventSyncLinkRepository } from '../repositories/google-event-sync-link.repository';
import type { IGoogleCalendarService } from '../services/google-calendar.service';

export interface DeleteOrCancelGoogleEventDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  syncLinkRepository: IGoogleEventSyncLinkRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
}

/**
 * `deleteOrCancelGoogleEvent()` — remove o espelhamento. Idempotente: sem
 * conexão ou sem link prévio, não há nada a fazer (`ok`), nunca erro.
 */
export class DeleteOrCancelGoogleEventUseCase {
  constructor(private readonly deps: DeleteOrCancelGoogleEventDeps) {}

  async execute(
    ctx: AuthContext,
    sourceType: GoogleSyncSourceType,
    sourceId: string,
  ): Promise<Result<void>> {
    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection) return ok(undefined);

    const link = await this.deps.syncLinkRepository.findBySource(
      ctx.tenantId,
      ctx.uid,
      sourceType,
      sourceId,
    );
    if (!link) return ok(undefined);

    const accessToken = this.deps.tokenCipher.decrypt(connection.accessTokenEncrypted);
    await this.deps.googleCalendarService.deleteEvent(
      accessToken,
      connection.calendarId,
      link.googleEventId,
    );
    await this.deps.syncLinkRepository.delete(link.id);
    return ok(undefined);
  }
}
