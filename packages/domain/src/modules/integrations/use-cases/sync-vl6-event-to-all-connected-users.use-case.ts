import type { Event } from '../../agenda/entities/event.entity';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator, ITokenCipher } from '../../../shared/ports';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleEventSyncLinkRepository } from '../repositories/google-event-sync-link.repository';
import type { IGoogleCalendarService } from '../services/google-calendar.service';
import { SyncVl6EventToGoogleUseCase } from './sync-vl6-event-to-google.use-case';

export interface SyncVl6EventToAllConnectedUsersDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  syncLinkRepository: IGoogleEventSyncLinkRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface SyncVl6EventToAllConnectedUsersResult {
  succeeded: number;
  /** IDs dos Irmãos cuja sincronização individual falhou — a criação/edição do evento nunca é afetada. */
  failedUserIds: string[];
}

/**
 * Fan-out de "Agenda da Loja → Google Agenda" — dispara ao criar/editar um
 * evento VL6, espelhando-o no Google Agenda de cada Irmão com conexão ativa
 * e a preferência `sincronizarVL6ParaGoogle` ligada. Cada falha individual
 * (token expirado, API do Google fora do ar etc.) é isolada: nunca lança,
 * nunca impede os demais Irmãos, e o chamador decide o que fazer com
 * `failedUserIds` (ex.: registrar em observabilidade).
 */
export class SyncVl6EventToAllConnectedUsersUseCase {
  private readonly syncOne: SyncVl6EventToGoogleUseCase;

  constructor(private readonly deps: SyncVl6EventToAllConnectedUsersDeps) {
    this.syncOne = new SyncVl6EventToGoogleUseCase(deps);
  }

  async execute(tenantId: string, event: Event): Promise<SyncVl6EventToAllConnectedUsersResult> {
    const connections = await this.deps.connectionRepository.listActiveWithVl6Sync(tenantId);

    const outcomes = await Promise.all(
      connections.map(async (connection) => {
        const ctx: AuthContext = {
          uid: connection.userId,
          tenantId,
          roleId: '',
          permissions: [],
        };
        try {
          const result = await this.syncOne.execute(ctx, event);
          return result.ok ? null : connection.userId;
        } catch {
          return connection.userId;
        }
      }),
    );

    const failedUserIds = outcomes.filter((userId): userId is string => userId !== null);
    return { succeeded: connections.length - failedUserIds.length, failedUserIds };
  }
}
