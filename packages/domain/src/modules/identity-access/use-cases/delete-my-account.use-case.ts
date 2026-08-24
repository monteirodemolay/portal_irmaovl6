import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IAuditLogRepository } from '../../audit/repositories/audit-log.repository';
import { RecordAuditEntryUseCase } from '../../audit/use-cases/record-audit-entry.use-case';
import type { IGoogleCalendarConnectionRepository } from '../../integrations/repositories/google-calendar-connection.repository';
import type { ILibraryFavoriteRepository } from '../../library/repositories/library-favorite.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { INotificationRepository } from '../../notification/repositories/notification.repository';
import type { IPersonalEventRepository } from '../../agenda/repositories/personal-event.repository';
import type { IPersonalNoteRepository } from '../../agenda/repositories/personal-note.repository';
import type { IPersonalTaskRepository } from '../../agenda/repositories/personal-task.repository';
import type { Role } from '../entities/role.entity';
import type { IRoleRepository } from '../repositories/role.repository';
import type { IUserRepository } from '../repositories/user.repository';

export interface DeleteMyAccountDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
  memberRepository: IMemberRepository;
  personalEventRepository: IPersonalEventRepository;
  personalTaskRepository: IPersonalTaskRepository;
  personalNoteRepository: IPersonalNoteRepository;
  libraryFavoriteRepository: ILibraryFavoriteRepository;
  googleCalendarConnectionRepository: IGoogleCalendarConnectionRepository;
  notificationRepository: INotificationRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

function isAdminTier(role: Role | null): boolean {
  if (!role) return false;
  if (role.sistemico) return role.chave === 'admin' || role.chave === 'super_admin';
  return role.permissoes.some((permission) => !permission.endsWith(':read'));
}

/**
 * "Excluir minha conta de acesso" (LGPD, docs/architecture) — apaga a
 * IDENTIDADE DE ACESSO (`User` + dados pessoais vinculados ao UID), nunca
 * o registro maçônico (`Member` só é desvinculado, `member.userId = null`,
 * continua existindo). A revogação de sessões Firebase Auth e a exclusão
 * da identidade em si (Admin SDK) acontecem na camada web, depois deste
 * use case ter sucesso — mesmo motivo de `revokeAllSessions` já viver lá
 * (Firebase Auth não é um repositório de domínio).
 *
 * Implementação técnica — não substitui revisão jurídica da LGPD.
 */
export class DeleteMyAccountUseCase {
  private readonly recordAuditEntry: RecordAuditEntryUseCase;

  constructor(private readonly deps: DeleteMyAccountDeps) {
    this.recordAuditEntry = new RecordAuditEntryUseCase(deps);
  }

  async execute(ctx: AuthContext): Promise<Result<void>> {
    const user = await this.deps.userRepository.findById(ctx.uid);
    if (!user || user.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('User', ctx.uid));
    }

    const role = await this.deps.roleRepository.findById(user.roleId);
    if (isAdminTier(role)) {
      const allUsers = await this.deps.userRepository.listByTenant(ctx.tenantId);
      const otherActiveUsers = allUsers.filter(
        (candidate) => candidate.id !== ctx.uid && candidate.statusConta === 'active',
      );
      const otherRoles = await Promise.all(
        otherActiveUsers.map((candidate) => this.deps.roleRepository.findById(candidate.roleId)),
      );
      const hasAnotherAdmin = otherRoles.some((candidateRole) => isAdminTier(candidateRole));
      if (!hasAnotherAdmin) {
        return err(
          new ConflictError(
            'Você é o único Administrador da Loja. Defina outro Administrador antes de excluir sua conta.',
          ),
        );
      }
    }

    const now = this.deps.clock.now();

    if (user.memberId) {
      const member = await this.deps.memberRepository.findById(user.memberId);
      if (member && member.userId === user.id) {
        await this.deps.memberRepository.update({
          ...member,
          userId: null,
          updatedAt: now,
          updatedBy: 'system',
        });
      }
    }

    const distantPast = new Date(2000, 0, 1);
    const distantFuture = new Date(2100, 0, 1);
    const [events, tasks, notes] = await Promise.all([
      this.deps.personalEventRepository.listByUserInRange(
        ctx.tenantId,
        ctx.uid,
        distantPast,
        distantFuture,
      ),
      this.deps.personalTaskRepository.listByUser(ctx.tenantId, ctx.uid),
      this.deps.personalNoteRepository.listByUser(ctx.tenantId, ctx.uid),
    ]);
    await Promise.all([
      ...events.map((event) =>
        this.deps.personalEventRepository.update({
          ...event,
          deletedAt: now,
          updatedAt: now,
          updatedBy: 'system',
        }),
      ),
      ...tasks.map((task) =>
        this.deps.personalTaskRepository.update({
          ...task,
          deletedAt: now,
          updatedAt: now,
          updatedBy: 'system',
        }),
      ),
      ...notes.map((note) =>
        this.deps.personalNoteRepository.update({
          ...note,
          deletedAt: now,
          updatedAt: now,
          updatedBy: 'system',
        }),
      ),
    ]);

    const favorites = await this.deps.libraryFavoriteRepository.listByUser(ctx.tenantId, ctx.uid);
    await Promise.all(
      favorites.map((favorite) => this.deps.libraryFavoriteRepository.delete(favorite.id)),
    );

    const connection = await this.deps.googleCalendarConnectionRepository.findByUserId(
      ctx.tenantId,
      ctx.uid,
    );
    if (connection) {
      await this.deps.googleCalendarConnectionRepository.delete(connection.id);
    }

    const notificationsPage = await this.deps.notificationRepository.listByRecipient(
      ctx.tenantId,
      ctx.uid,
      { limit: 1000 },
    );
    await Promise.all(
      notificationsPage.items.map((notification) =>
        this.deps.notificationRepository.update({
          ...notification,
          deletedAt: now,
          updatedAt: now,
          updatedBy: 'system',
        }),
      ),
    );

    await this.recordAuditEntry.execute({
      tenantId: ctx.tenantId,
      entidade: 'users',
      entidadeId: ctx.uid,
      acao: 'delete',
      usuarioId: ctx.uid,
      ip: null,
      dispositivo: null,
      valorAnterior: null,
      valorNovo: null,
    });

    await this.deps.userRepository.delete(ctx.uid);

    return ok(undefined);
  }
}
