import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Honor } from '../entities/honor.entity';
import type { IHonorRepository } from '../repositories/honor.repository';

export interface ListHonorsDeps {
  honorRepository: IHonorRepository;
}

/** Lista as honrarias de um Irmão, mais recente primeiro — base da aba "Trajetória e Honrarias". */
export class ListHonorsUseCase {
  constructor(private readonly deps: ListHonorsDeps) {}

  async execute(ctx: AuthContext, memberId: string): Promise<Honor[]> {
    requirePermission(ctx, 'honor:read');

    const honors = await this.deps.honorRepository.listByMemberId(ctx.tenantId, memberId);
    return honors.sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0));
  }
}
