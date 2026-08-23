import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface ListMostViewedArchiveItemsDeps {
  archiveItemRepository: IArchiveItemRepository;
}

// Mesmo teto pragmático de `ListDuplicateMediaAssetsUseCase` — o acervo é
// pequeno o suficiente hoje para uma varredura completa em memória.
const SCAN_LIMIT = 5000;

/**
 * Os N `ArchiveItem`s publicados com mais visualizações — Fase C
 * "Administração & métricas", seção "Mais visualizados" do Painel
 * administrativo. Só itens publicados entram no ranking (rascunho não deve
 * aparecer como "mais visualizado" antes de existir publicamente); item sem
 * nenhuma visualização registrada ainda (`contagemVisualizacoes`
 * ausente/`undefined`) conta como `0`.
 */
export class ListMostViewedArchiveItemsUseCase {
  constructor(private readonly deps: ListMostViewedArchiveItemsDeps) {}

  async execute(ctx: AuthContext, limit: number): Promise<ArchiveItem[]> {
    requirePermission(ctx, 'archiveItem:read');

    const page = await this.deps.archiveItemRepository.findByTenant(ctx.tenantId, {
      limit: SCAN_LIMIT,
    });

    return page.items
      .filter((item) => item.publicacaoStatus === 'publicado')
      .sort((a, b) => (b.contagemVisualizacoes ?? 0) - (a.contagemVisualizacoes ?? 0))
      .slice(0, limit);
  }
}
