import type { AuthContext } from '../../../shared/auth-context';
import type { ITokenCipher } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { GoogleSyncSourceType } from '../entities/google-event-sync-link.entity';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleEventSyncLinkRepository } from '../repositories/google-event-sync-link.repository';
import type {
  GoogleCalendarEventInput,
  IGoogleCalendarService,
} from '../services/google-calendar.service';

export interface UpdateGoogleEventDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  syncLinkRepository: IGoogleEventSyncLinkRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
}

/** `updateGoogleEvent()` — reenvia uma atualização para um item já espelhado. */
export class UpdateGoogleEventUseCase {
  constructor(private readonly deps: UpdateGoogleEventDeps) {}

  async execute(
    ctx: AuthContext,
    sourceType: GoogleSyncSourceType,
    sourceId: string,
    input: GoogleCalendarEventInput,
  ): Promise<Result<void>> {
    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection) return err(new NotFoundError('GoogleCalendarConnection', ctx.uid));

    const link = await this.deps.syncLinkRepository.findBySource(
      ctx.tenantId,
      ctx.uid,
      sourceType,
      sourceId,
    );
    if (!link) return err(new NotFoundError('GoogleEventSyncLink', sourceId));

    const accessToken = this.deps.tokenCipher.decrypt(connection.accessTokenEncrypted);
    await this.deps.googleCalendarService.updateEvent(
      accessToken,
      connection.calendarId,
      link.googleEventId,
      input,
    );
    return ok(undefined);
  }
}
