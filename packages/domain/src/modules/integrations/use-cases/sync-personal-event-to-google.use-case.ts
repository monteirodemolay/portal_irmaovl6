import type { IPersonalEventRepository } from '../../agenda/repositories/personal-event.repository';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator, ITokenCipher } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleEventSyncLinkRepository } from '../repositories/google-event-sync-link.repository';
import type {
  GoogleCalendarEventInput,
  IGoogleCalendarService,
} from '../services/google-calendar.service';

export interface SyncPersonalEventToGoogleDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  syncLinkRepository: IGoogleEventSyncLinkRepository;
  personalEventRepository: IPersonalEventRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * `syncPersonalEventToGoogle()` — o compromisso é privado do usuário; nunca
 * pertence à Agenda da Loja. Só sincroniza se `PersonalEvent.sincronizarComGoogle`
 * e a preferência `sincronizarPessoalParaGoogle` da conexão estiverem ligadas.
 */
export class SyncPersonalEventToGoogleUseCase {
  constructor(private readonly deps: SyncPersonalEventToGoogleDeps) {}

  async execute(ctx: AuthContext, personalEventId: string): Promise<Result<void>> {
    const event = await this.deps.personalEventRepository.findById(personalEventId);
    if (!event || event.tenantId !== ctx.tenantId || event.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalEvent', personalEventId));
    }
    if (!event.sincronizarComGoogle) return ok(undefined);

    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection || !connection.preferences.sincronizarPessoalParaGoogle) return ok(undefined);

    const accessToken = this.deps.tokenCipher.decrypt(connection.accessTokenEncrypted);
    const input: GoogleCalendarEventInput = {
      titulo: event.titulo,
      descricao: event.descricao,
      local: event.local,
      inicio: event.dataInicio,
      fim: event.dataFim,
    };

    if (event.googleEventId) {
      await this.deps.googleCalendarService.updateEvent(
        accessToken,
        connection.calendarId,
        event.googleEventId,
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
    await this.deps.personalEventRepository.update({
      ...event,
      googleEventId,
      updatedAt: now,
      updatedBy: ctx.uid,
    });
    await this.deps.syncLinkRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      sourceType: 'personal',
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
