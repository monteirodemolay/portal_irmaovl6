import type { Event } from '../../agenda/entities/event.entity';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator, ITokenCipher } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleEventSyncLinkRepository } from '../repositories/google-event-sync-link.repository';
import type {
  GoogleCalendarEventInput,
  IGoogleCalendarService,
} from '../services/google-calendar.service';

export interface SyncVl6EventToGoogleDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  syncLinkRepository: IGoogleEventSyncLinkRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * `syncVL6CalendarToGoogle()` — espelha um `Event` institucional no Google
 * Agenda do Irmão, só se ele tiver conexão ativa e a preferência
 * `sincronizarVL6ParaGoogle` ligada. Sem `requirePermission`: quem chama já
 * é o próprio dono da conexão (`ctx.uid`), ação pessoal.
 */
export class SyncVl6EventToGoogleUseCase {
  constructor(private readonly deps: SyncVl6EventToGoogleDeps) {}

  async execute(ctx: AuthContext, event: Event): Promise<Result<void>> {
    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection || !connection.preferences.sincronizarVL6ParaGoogle) return ok(undefined);

    const accessToken = this.deps.tokenCipher.decrypt(connection.accessTokenEncrypted);
    const input: GoogleCalendarEventInput = {
      titulo: event.titulo,
      descricao: event.descricao,
      local: event.local,
      inicio: event.dataInicio,
      fim: event.dataFim,
    };

    const existingLink = await this.deps.syncLinkRepository.findBySource(
      ctx.tenantId,
      ctx.uid,
      'vl6',
      event.id,
    );
    if (existingLink) {
      await this.deps.googleCalendarService.updateEvent(
        accessToken,
        connection.calendarId,
        existingLink.googleEventId,
        input,
      );
      return ok(undefined);
    }

    const googleEventId = await this.deps.googleCalendarService.createEvent(
      accessToken,
      connection.calendarId,
      input,
    );
    const now = this.deps.clock.now();
    await this.deps.syncLinkRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      sourceType: 'vl6',
      sourceId: event.id,
      googleEventId,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    return ok(undefined);
  }
}
