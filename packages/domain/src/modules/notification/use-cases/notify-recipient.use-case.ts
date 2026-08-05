import type { NotificationType } from '@vl6/shared';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { Notification } from '../entities/notification.entity';
import type { INotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import type { INotificationRepository } from '../repositories/notification.repository';
import type { INotificationGateway } from '../services/notification-gateway';

export interface NotifyRecipientInput {
  tenantId: string;
  destinatarioId: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  link: string | null;
}

export interface NotifyRecipientDeps {
  notificationRepository: INotificationRepository;
  notificationPreferenceRepository: INotificationPreferenceRepository;
  notificationGateway: INotificationGateway;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Mecanismo central de disparo, usado pelas triggers de avisos de alta
 * prioridade e de novos eventos — docs/architecture/06 §6.8. O canal
 * `interno` é sempre persistido (aparece na central de notificações do
 * Irmão); os demais canais habilitados em `NotificationPreference` são
 * despachados via `INotificationGateway`, best-effort — a entrega externa
 * não é pré-condição para a notificação interna existir.
 */
export class NotifyRecipientUseCase {
  constructor(private readonly deps: NotifyRecipientDeps) {}

  async execute(input: NotifyRecipientInput): Promise<Notification> {
    const now = this.deps.clock.now();
    const notification: Notification = {
      id: this.deps.idGenerator.next(),
      tenantId: input.tenantId,
      destinatarioId: input.destinatarioId,
      tipo: input.tipo,
      titulo: input.titulo,
      mensagem: input.mensagem,
      lida: false,
      canal: 'interno',
      link: input.link,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.notificationRepository.create(notification);

    const preference = await this.deps.notificationPreferenceRepository.findByUserId(
      input.tenantId,
      input.destinatarioId,
    );
    const externalChannels = (preference?.canaisHabilitados ?? []).filter(
      (canal) => canal !== 'interno',
    );

    for (const canal of externalChannels) {
      await this.deps.notificationGateway.send({ ...notification, canal });
    }

    return notification;
  }
}
