import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type {
  LegalDocumentKey,
  LegalDocumentVersion,
} from '../entities/legal-document-version.entity';
import type { ILegalDocumentVersionRepository } from '../repositories/legal-document-version.repository';

export interface ListLegalDocumentVersionsDeps {
  legalDocumentVersionRepository: ILegalDocumentVersionRepository;
}

/** Histórico completo de versões de um documento — alimenta a área "Termos e Privacidade". */
export class ListLegalDocumentVersionsUseCase {
  constructor(private readonly deps: ListLegalDocumentVersionsDeps) {}

  async execute(
    ctx: AuthContext,
    documento: LegalDocumentKey,
  ): Promise<Result<LegalDocumentVersion[]>> {
    requirePermission(ctx, 'legalDocument:read');
    const versions = await this.deps.legalDocumentVersionRepository.listByDocumento(
      ctx.tenantId,
      documento,
    );
    return ok(versions);
  }
}
