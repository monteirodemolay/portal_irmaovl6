import type { AnnouncementFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface CreateAnnouncementDeps {
  announcementRepository: IAnnouncementRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

const MAX_HIGHLIGHTED = 3;

/**
 * Cria um aviso em rascunho. Quando `destacar = true`, garante o limite de
 * 3 avisos destacados simultâneos — o mais antigo é automaticamente
 * desmarcado (docs/architecture/06-regras-negocio.md §6.5).
 */
export class CreateAnnouncementUseCase {
  constructor(private readonly deps: CreateAnnouncementDeps) {}

  async execute(ctx: AuthContext, input: AnnouncementFormValues): Promise<Result<Announcement>> {
    requirePermission(ctx, 'announcement:create');

    if (input.destacar) {
      await this.enforceHighlightLimit(ctx);
    }

    const now = this.deps.clock.now();
    const announcement: Announcement = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      publicado: false,
      dataPublicacao: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.announcementRepository.create(announcement);

    return ok(announcement);
  }

  private async enforceHighlightLimit(ctx: AuthContext): Promise<void> {
    const highlighted = await this.deps.announcementRepository.listHighlighted(ctx.tenantId);
    if (highlighted.length < MAX_HIGHLIGHTED) return;

    const oldest = [...highlighted].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0];
    if (!oldest) return;

    await this.deps.announcementRepository.update({
      ...oldest,
      destacar: false,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    });
  }
}
