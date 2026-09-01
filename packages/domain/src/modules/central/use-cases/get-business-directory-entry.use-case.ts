import type { AuthContext } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { BusinessDirectoryEntryDTO } from '../dtos/business-directory-entry.dto';
import {
  SearchBusinessDirectoryUseCase,
  type SearchBusinessDirectoryDeps,
} from './search-business-directory.use-case';

export type GetBusinessDirectoryEntryDeps = SearchBusinessDirectoryDeps;

/**
 * Página própria da empresa/atividade (`/irmaos/negocios/[businessId]`) —
 * deliberadamente composta sobre `SearchBusinessDirectoryUseCase` em vez de
 * duplicar sua lógica de achatar `negocios[]` publicado/aprovado por perfil:
 * mesma checagem de permissão (`memberDirectory:read`, via
 * `requirePermission` dentro do use case reaproveitado), mesmo isolamento de
 * tenant (a busca só varre `ctx.tenantId`) e mesmo filtro de publicação
 * (`buildPublicMemberProfileDTO` já corta negócios fora de `status:
 * 'published'`). `null` cobre igualmente "nunca existiu", "não publicado" e
 * "de outro tenant" — nunca revela qual dos três é, mesmo princípio de
 * privacidade de `GetPublicMemberProfileUseCase`.
 */
export class GetBusinessDirectoryEntryUseCase {
  private readonly searchUseCase: SearchBusinessDirectoryUseCase;

  constructor(deps: GetBusinessDirectoryEntryDeps) {
    this.searchUseCase = new SearchBusinessDirectoryUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    businessId: string,
  ): Promise<Result<BusinessDirectoryEntryDTO | null>> {
    const result = await this.searchUseCase.execute(ctx, {});
    if (!result.ok) return result;

    const entry = result.value.items.find((item) => item.businessId === businessId) ?? null;
    return ok(entry);
  }
}
