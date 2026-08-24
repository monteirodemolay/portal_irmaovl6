import 'server-only';
import * as Sentry from '@sentry/nextjs';
import type { Role, User } from '@vl6/domain';
import type { NotificationPriority, NotificationType } from '@vl6/shared';
import { errorToLogContext, logger } from '@vl6/shared';
import type { ServerContainer } from '@vl6/infra';

export interface NotifyAllActiveUsersInput {
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  link: string | null;
  priority?: NotificationPriority;
  requiresAcknowledgement?: boolean;
  expiresAt?: Date | null;
  actionLabel?: string | null;
  /** Uma chave por destinatário — obrigatória pra gatilhos que podem rodar mais de uma vez pro mesmo evento de negócio. */
  dedupeKey?: (userId: string) => string;
  /**
   * Filtro extra de audiência, além de "ativo" — usado quando o conteúdo
   * de origem tem seu próprio nível de acesso (ex.: `ArchiveItem.
   * nivelAcesso: 'administracao'`, docs/architecture/11-acervo-vl6.md) e a
   * notificação NUNCA pode vazar pra quem não enxergaria o conteúdo
   * original. Recebe o papel do usuário (`null` se não resolvido).
   */
  audienceFilter?: (user: User, role: Role | null) => boolean;
}

/**
 * Gatilho imediato genérico da Central de Avisos — mesmo padrão de fan-out
 * já usado por `syncEventToConnectedGoogleCalendars`/
 * `notifyConnectedUsersOfNewEvent` (agenda-actions.ts): roda DEPOIS que o
 * use case principal já teve sucesso, nunca impede a ação em si, falha só
 * é registrada em observabilidade. Audiência: todos os usuários com
 * `statusConta === 'active'` do tenant — cada notificação nasce aqui, na
 * camada de Server Action, não dentro do Use Case de domínio (mantém
 * `CreateEventUseCase`/`PublishAnnouncementUseCase`/etc. focados numa única
 * regra de negócio).
 */
export async function notifyAllActiveUsers(
  container: ServerContainer,
  tenantId: string,
  input: NotifyAllActiveUsersInput,
): Promise<void> {
  try {
    const users = await container.repositories.user.listByTenant(tenantId);
    let active = users.filter((user) => user.statusConta === 'active');

    if (input.audienceFilter) {
      const roles = await container.repositories.role.listByTenant(tenantId);
      const roleById = new Map(roles.map((role) => [role.id, role]));
      active = active.filter((user) => input.audienceFilter!(user, roleById.get(user.roleId) ?? null));
    }

    await Promise.all(
      active.map((user) =>
        container.useCases.notifyRecipient.execute({
          tenantId,
          destinatarioId: user.id,
          tipo: input.tipo,
          titulo: input.titulo,
          mensagem: input.mensagem,
          link: input.link,
          priority: input.priority,
          requiresAcknowledgement: input.requiresAcknowledgement,
          expiresAt: input.expiresAt,
          actionLabel: input.actionLabel,
          dedupeKey: input.dedupeKey?.(user.id) ?? null,
        }),
      ),
    );
  } catch (error) {
    logger.error('Falha inesperada ao notificar usuários ativos', {
      route: 'notifyAllActiveUsers',
      tenantId,
      tipo: input.tipo,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'notifyAllActiveUsers', tenantId } });
  }
}
