import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Link } from '../entities/link.entity';
import type { ILinkRepository } from '../repositories/link.repository';

export interface CreateLinkInput {
  titulo: string;
  url: string;
  icone: string | null;
  categoria: string;
  ordem: number;
}

export interface CreateLinkDeps {
  linkRepository: ILinkRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateLinkUseCase {
  constructor(private readonly deps: CreateLinkDeps) {}

  async execute(ctx: AuthContext, input: CreateLinkInput): Promise<Result<Link>> {
    requirePermission(ctx, 'link:create');

    const now = this.deps.clock.now();
    const link: Link = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.linkRepository.create(link);

    return ok(link);
  }
}
