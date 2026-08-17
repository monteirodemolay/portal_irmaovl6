import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type {
  GoogleCalendarConnection,
  GoogleCalendarConnectionPreferences,
} from '../entities/google-calendar-connection.entity';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';

export interface UpdateGoogleCalendarPreferencesDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  clock: IClock;
}

export interface UpdateGoogleCalendarPreferencesInput {
  preferences: GoogleCalendarConnectionPreferences;
  calendarId: string;
}

/** Sem `requirePermission`: ownership por `ctx.uid`, mesma ação pessoal das demais use cases desta integração. */
export class UpdateGoogleCalendarPreferencesUseCase {
  constructor(private readonly deps: UpdateGoogleCalendarPreferencesDeps) {}

  async execute(
    ctx: AuthContext,
    input: UpdateGoogleCalendarPreferencesInput,
  ): Promise<Result<GoogleCalendarConnection>> {
    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection) return err(new NotFoundError('GoogleCalendarConnection', ctx.uid));

    const updated: GoogleCalendarConnection = {
      ...connection,
      preferences: input.preferences,
      calendarId: input.calendarId,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.connectionRepository.update(updated);
    return ok(updated);
  }
}
