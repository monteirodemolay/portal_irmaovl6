import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IRoleRepository } from '../../identity-access/repositories/role.repository';
import type { IUserRepository } from '../../identity-access/repositories/user.repository';
import type { INotificationPreferenceRepository } from '../../notification/repositories/notification-preference.repository';
import type { INotificationRepository } from '../../notification/repositories/notification.repository';
import type { INotificationGateway } from '../../notification/services/notification-gateway';
import { NotifyUsersWithPermissionUseCase } from '../../notification/use-cases/notify-users-with-permission.use-case';
import type { NewsComment } from '../entities/news-comment.entity';
import type { INewsCommentRepository } from '../repositories/news-comment.repository';
import type { INewsRepository } from '../repositories/news.repository';

export interface CreateNewsCommentDeps {
  newsCommentRepository: INewsCommentRepository;
  newsRepository: INewsRepository;
  memberRepository: IMemberRepository;
  roleRepository: IRoleRepository;
  userRepository: IUserRepository;
  notificationRepository: INotificationRepository;
  notificationPreferenceRepository: INotificationPreferenceRepository;
  notificationGateway: INotificationGateway;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Comentário nasce não moderado (`moderado: false`) — só aparece após
 * aprovação. Quem detém `news:manage` é avisado na hora (Central de
 * Notificações), pra não depender do Administrador lembrar de abrir
 * Notícia por Notícia procurando comentário pendente.
 */
export class CreateNewsCommentUseCase {
  private readonly notifyModerators: NotifyUsersWithPermissionUseCase;

  constructor(private readonly deps: CreateNewsCommentDeps) {
    this.notifyModerators = new NotifyUsersWithPermissionUseCase(deps);
  }

  async execute(ctx: AuthContext, newsId: string, texto: string): Promise<Result<NewsComment>> {
    requirePermission(ctx, 'news:read');

    const news = await this.deps.newsRepository.findById(newsId);
    if (!news || news.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('News', newsId));
    }

    const now = this.deps.clock.now();
    const comment: NewsComment = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      newsId,
      autorId: ctx.uid,
      texto,
      moderado: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.newsCommentRepository.create(comment);

    const author = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    await this.notifyModerators.execute({
      tenantId: ctx.tenantId,
      permission: 'news:manage',
      tipo: 'news',
      titulo: 'Novo comentário aguardando moderação',
      mensagem: `${author?.nomeCompleto ?? 'Um Irmão'} comentou em "${news.titulo}": "${texto.slice(0, 140)}${texto.length > 140 ? '…' : ''}"`,
      link: `/admin/conteudo/noticias/${newsId}`,
      priority: 'attention',
      actionLabel: 'Moderar comentário',
      dedupeKey: (userId) => `news-comment:${comment.id}:notify:${userId}`,
    });

    return ok(comment);
  }
}
