import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { LibraryCategory } from '../entities/library-category.entity';
import type { ILibraryCategoryRepository } from '../repositories/library-category.repository';

export interface CreateLibraryCategoryInput {
  nome: string;
  categoriaPaiId: string | null;
  ordem: number;
}

export interface CreateLibraryCategoryDeps {
  libraryCategoryRepository: ILibraryCategoryRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateLibraryCategoryUseCase {
  constructor(private readonly deps: CreateLibraryCategoryDeps) {}

  async execute(
    ctx: AuthContext,
    input: CreateLibraryCategoryInput,
  ): Promise<Result<LibraryCategory>> {
    requirePermission(ctx, 'libraryItem:manage');

    const now = this.deps.clock.now();
    const category: LibraryCategory = {
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
    await this.deps.libraryCategoryRepository.create(category);

    return ok(category);
  }
}
