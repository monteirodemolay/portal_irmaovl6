import type { NotificationChannel } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { NotificationPreference } from '../entities/notification-preference.entity';
import type { INotificationPreferenceRepository } from '../repositories/notification-preference.repository';

export interface UpdateNotificationPreferenceDeps {
  preferenceRepository: INotificationPreferenceRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Ação pessoal — cada Irmão configura seus próprios canais de notificação. */
export class UpdateNotificationPreferenceUseCase {
  constructor(private readonly deps: UpdateNotificationPreferenceDeps) {}

  async execute(
    ctx: AuthContext,
    canaisHabilitados: NotificationChannel[],
  ): Promise<Result<NotificationPreference>> {
    const now = this.deps.clock.now();
    const existing = await this.deps.preferenceRepository.findByUserId(ctx.tenantId, ctx.uid);

    if (existing) {
      const updated: NotificationPreference = {
        ...existing,
        canaisHabilitados,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.preferenceRepository.update(updated);
      return ok(updated);
    }

    const preference: NotificationPreference = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      canaisHabilitados,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.preferenceRepository.create(preference);

    return ok(preference);
  }
}
