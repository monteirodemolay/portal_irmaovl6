import type { AuthContext } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type {
  LegalDocumentKey,
  LegalDocumentVersion,
} from '../entities/legal-document-version.entity';
import type { ILegalDocumentVersionRepository } from '../repositories/legal-document-version.repository';

export interface ListLegalDocumentVersionsDeps {
  legalDocumentVersionRepository: ILegalDocumentVersionRepository;
}

/**
 * Histórico completo de versões de um documento — alimenta a área "Termos e
 * Privacidade" (gate de reaceite obrigatório, `(member)/layout.tsx`).
 *
 * Sem `requirePermission` de propósito, mesmo motivo de
 * `GetLegalAcceptanceStatusUseCase`: ler o texto/histórico dos documentos
 * legais pra poder aceitá-los é um fluxo de conformidade pessoal, não uma
 * ação administrativa — o mesmo conteúdo já é 100% público em
 * `/termos/[documento]` (lido direto do repositório, sem sessão nem
 * permissão nenhuma, pra quem nem conta ainda tem). Antes exigia
 * `legalDocument:read`, e uma sessão cujo papel ainda não tivesse essa
 * permissão sincronizada (`/admin/pessoas/permissoes`) travava com
 * `ForbiddenError` — justo na página pra qual o layout força o
 * redirecionamento de reaceite obrigatório, deixando o Irmão sem conseguir
 * aceitar e preso fora do Portal. Esse exato caso já é o motivo documentado
 * em `(member)/error.tsx`.
 */
export class ListLegalDocumentVersionsUseCase {
  constructor(private readonly deps: ListLegalDocumentVersionsDeps) {}

  async execute(
    ctx: AuthContext,
    documento: LegalDocumentKey,
  ): Promise<Result<LegalDocumentVersion[]>> {
    const versions = await this.deps.legalDocumentVersionRepository.listByDocumento(
      ctx.tenantId,
      documento,
    );
    return ok(versions);
  }
}
