import type { NotificationPriority } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ValidationError, err, ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { INotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import type { INotificationRepository } from '../repositories/notification.repository';
import type { INotificationGateway } from '../services/notification-gateway';
import { NotifyRecipientUseCase } from './notify-recipient.use-case';

export interface SendTargetedNotificationInput {
  memberIds: string[];
  titulo: string;
  mensagem: string;
  link?: string | null;
  priority?: NotificationPriority;
  requiresAcknowledgement?: boolean;
  actionLabel?: string | null;
  /** `null`/omitido cai no teto padrão de 30 dias (`NotifyRecipientUseCase`) — informe pra algo que precisa ficar visível por mais tempo. */
  expiresAt?: Date | null;
}

export interface SendTargetedNotificationReport {
  enviadas: number;
  /** Irmãos selecionados sem login vinculado (`Member.userId`) — não têm painel próprio pra receber, ficaram de fora. */
  semAcesso: { id: string; nomeCompleto: string }[];
}

export interface SendTargetedNotificationDeps {
  memberRepository: IMemberRepository;
  notificationRepository: INotificationRepository;
  notificationPreferenceRepository: INotificationPreferenceRepository;
  notificationGateway: INotificationGateway;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Envio manual do Administrador pra um Irmão específico ou um grupo (a
 * seleção em si já é o "grupo" — sem categoria fixa, monta na hora) — pedido
 * explícito: "deixe pelo back-end uma forma de enviar Notificações pessoais
 * para determinado irmão ou um grupo de irmãos, afim de cumprir determinado
 * propósito". `tipo` sempre `'system'` (reserva já existente em
 * `NOTIFICATION_TYPES` sem nenhum gatilho até então — cabe exatamente nisso:
 * mensagem administrativa avulsa, não automática). Irmãos sem `userId`
 * (nunca reivindicaram/criaram acesso ao Portal) não têm pra onde mandar —
 * ficam de fora, listados no relatório em vez de travar o envio dos outros.
 */
export class SendTargetedNotificationUseCase {
  private readonly notifyRecipient: NotifyRecipientUseCase;

  constructor(private readonly deps: SendTargetedNotificationDeps) {
    this.notifyRecipient = new NotifyRecipientUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    input: SendTargetedNotificationInput,
  ): Promise<Result<SendTargetedNotificationReport>> {
    requirePermission(ctx, 'notification:manage');

    const memberIds = Array.from(new Set(input.memberIds));
    if (memberIds.length === 0) {
      return err(new ValidationError('Selecione ao menos um Irmão para notificar.'));
    }
    if (!input.titulo.trim() || !input.mensagem.trim()) {
      return err(new ValidationError('Título e mensagem são obrigatórios.'));
    }

    const members = await Promise.all(
      memberIds.map((id) => this.deps.memberRepository.findById(id)),
    );

    const semAcesso: { id: string; nomeCompleto: string }[] = [];
    let enviadas = 0;

    for (const member of members) {
      if (!member || member.tenantId !== ctx.tenantId || member.deletedAt) continue;
      if (!member.userId) {
        semAcesso.push({ id: member.id, nomeCompleto: member.nomeCompleto });
        continue;
      }

      await this.notifyRecipient.execute({
        tenantId: ctx.tenantId,
        destinatarioId: member.userId,
        tipo: 'system',
        titulo: input.titulo.trim(),
        mensagem: input.mensagem.trim(),
        link: input.link ?? null,
        priority: input.priority ?? 'normal',
        requiresAcknowledgement: input.requiresAcknowledgement ?? false,
        actionLabel: input.actionLabel ?? null,
        expiresAt: input.expiresAt ?? null,
      });
      enviadas += 1;
    }

    return ok({ enviadas, semAcesso });
  }
}
