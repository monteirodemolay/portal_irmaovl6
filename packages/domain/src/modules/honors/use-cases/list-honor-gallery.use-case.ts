import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Honor } from '../entities/honor.entity';
import type { IHonorRepository } from '../repositories/honor.repository';

export interface ListHonorGalleryDeps {
  honorRepository: IHonorRepository;
}

/**
 * Lista todas as Honrarias e Condecorações do tenant, mais recente primeiro
 * — base da "Galeria de Honra VL6" (Fase 4), página institucional pública
 * dentro do Portal (qualquer Irmão com `honor:read` vê, diferente do
 * cadastro em si, que exige `honor:manage`).
 */
export class ListHonorGalleryUseCase {
  constructor(private readonly deps: ListHonorGalleryDeps) {}

  async execute(ctx: AuthContext): Promise<Honor[]> {
    requirePermission(ctx, 'honor:read');

    const honors = await this.deps.honorRepository.listByTenant(ctx.tenantId);
    return honors.sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0));
  }
}
