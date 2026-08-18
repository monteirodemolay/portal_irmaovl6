import type { Event } from '../../agenda/entities/event.entity';
import type { INotificationGateway } from '../../notification/services/notification-gateway';
import type { INotificationPreferenceRepository } from '../../notification/repositories/notification-preference.repository';
import type { INotificationRepository } from '../../notification/repositories/notification.repository';
import { NotifyRecipientUseCase } from '../../notification/use-cases/notify-recipient.use-case';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';

export interface NotifyConnectedUsersOfNewVl6EventDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  notificationRepository: INotificationRepository;
  notificationPreferenceRepository: INotificationPreferenceRepository;
  notificationGateway: INotificationGateway;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Avisa (notificação interna, `tipo: 'event'`) cada Irmão com a Agenda da
 * Loja sincronizada com o Google Agenda (`sincronizarVL6ParaGoogle`) sempre
 * que um evento novo é cadastrado — mesma audiência do fan-out de
 * `SyncVl6EventToAllConnectedUsersUseCase`, só que avisando em vez de
 * espelhar. Só dispara na criação (não a cada edição, pra não repetir
 * aviso do mesmo evento).
 */
export class NotifyConnectedUsersOfNewVl6EventUseCase {
  private readonly notifyRecipient: NotifyRecipientUseCase;

  constructor(private readonly deps: NotifyConnectedUsersOfNewVl6EventDeps) {
    this.notifyRecipient = new NotifyRecipientUseCase(deps);
  }

  async execute(tenantId: string, event: Event): Promise<void> {
    const connections = await this.deps.connectionRepository.listActiveWithVl6Sync(tenantId);

    await Promise.all(
      connections.map((connection) =>
        this.notifyRecipient.execute({
          tenantId,
          destinatarioId: connection.userId,
          tipo: 'event',
          titulo: 'Novo evento na Agenda da Loja',
          mensagem: `"${event.titulo}" foi adicionado à Agenda da Loja e já está disponível no seu Google Agenda.`,
          link: `/agenda`,
        }),
      ),
    );
  }
}
