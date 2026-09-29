import type { NotificationPriority, NotificationType, PermissionKey } from '@vl6/shared';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { IRoleRepository } from '../../identity-access/repositories/role.repository';
import type { IUserRepository } from '../../identity-access/repositories/user.repository';
import type { INotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import type { INotificationRepository } from '../repositories/notification.repository';
import type { INotificationGateway } from '../services/notification-gateway';
import { NotifyRecipientUseCase } from './notify-recipient.use-case';

export interface NotifyUsersWithPermissionInput {
  tenantId: string;
  /** Só o papel que detém esta permissão literalmente (`role:manage`) é considerado — mesma granularidade exigida pelo `requirePermission` do caso de uso que a notificação avisa. */
  permission: PermissionKey;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  link: string | null;
  priority?: NotificationPriority;
  actionLabel?: string | null;
  /** Chave de idempotência por destinatário — recebe o `uid` de cada usuário notificado. */
  dedupeKey?: (userId: string) => string;
}

export interface NotifyUsersWithPermissionDeps {
  roleRepository: IRoleRepository;
  userRepository: IUserRepository;
  notificationRepository: INotificationRepository;
  notificationPreferenceRepository: INotificationPreferenceRepository;
  notificationGateway: INotificationGateway;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Avisa toda conta ativa do tenant cujo papel detém a permissão informada —
 * usado por eventos que nascem "pendentes de moderação" (ex.: um novo
 * comentário de Notícia) e que, sem isso, só apareceriam pra um
 * Administrador que entrasse manualmente na tela certa pra conferir.
 */
export class NotifyUsersWithPermissionUseCase {
  private readonly notifyRecipient: NotifyRecipientUseCase;

  constructor(private readonly deps: NotifyUsersWithPermissionDeps) {
    this.notifyRecipient = new NotifyRecipientUseCase(deps);
  }

  async execute(input: NotifyUsersWithPermissionInput): Promise<number> {
    const [roles, users] = await Promise.all([
      this.deps.roleRepository.listByTenant(input.tenantId),
      this.deps.userRepository.listByTenant(input.tenantId),
    ]);

    const eligibleRoleIds = new Set(
      roles.filter((role) => role.permissoes.includes(input.permission)).map((role) => role.id),
    );
    const recipients = users.filter(
      (user) => user.statusConta === 'active' && eligibleRoleIds.has(user.roleId),
    );

    for (const user of recipients) {
      await this.notifyRecipient.execute({
        tenantId: input.tenantId,
        destinatarioId: user.id,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        link: input.link,
        priority: input.priority ?? 'normal',
        actionLabel: input.actionLabel ?? null,
        dedupeKey: input.dedupeKey ? input.dedupeKey(user.id) : null,
      });
    }

    return recipients.length;
  }
}
