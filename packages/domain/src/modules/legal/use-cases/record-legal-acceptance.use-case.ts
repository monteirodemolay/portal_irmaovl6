import type { IClock, IHasher, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { LegalDocumentAcceptance } from '../entities/legal-document-acceptance.entity';
import type { LegalDocumentKey } from '../entities/legal-document-version.entity';
import type { ILegalDocumentAcceptanceRepository } from '../repositories/legal-document-acceptance.repository';
import type { ILegalDocumentVersionRepository } from '../repositories/legal-document-version.repository';

export interface RecordLegalAcceptanceInput {
  tenantId: string;
  userId: string;
  documento: LegalDocumentKey;
  versao: string;
  ip: string | null;
  userAgent: string | null;
}

export interface RecordLegalAcceptanceDeps {
  legalDocumentVersionRepository: ILegalDocumentVersionRepository;
  legalDocumentAcceptanceRepository: ILegalDocumentAcceptanceRepository;
  hasher: IHasher;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Registra o aceite de uma versão específica de um documento legal.
 *
 * Sem `AuthContext` de propósito — mesmo motivo de `ClaimMemberAccountUseCase`:
 * no fluxo público de autorreivindicação de conta, o aceite precisa ser
 * gravado logo após a criação do usuário no Firebase Auth, antes de existir
 * qualquer sessão/cookie/Custom Claims. No fluxo autenticado (revisão de uma
 * versão nova pós-login), a Server Action chama isto com `ctx.uid`/
 * `ctx.tenantId` já extraídos de uma sessão validada. A confiança de quem é
 * o usuário vem de quem chama este Use Case, não de uma permissão checada
 * aqui dentro.
 */
export class RecordLegalAcceptanceUseCase {
  constructor(private readonly deps: RecordLegalAcceptanceDeps) {}

  async execute(input: RecordLegalAcceptanceInput): Promise<Result<LegalDocumentAcceptance>> {
    const versions = await this.deps.legalDocumentVersionRepository.listByDocumento(
      input.tenantId,
      input.documento,
    );
    const version = versions.find((v) => v.versao === input.versao);
    if (!version) {
      return err(new NotFoundError('LegalDocumentVersion', input.versao));
    }

    const acceptance: LegalDocumentAcceptance = {
      id: this.deps.idGenerator.next(),
      tenantId: input.tenantId,
      userId: input.userId,
      documento: input.documento,
      versaoAceita: input.versao,
      aceitoEm: this.deps.clock.now(),
      ip: input.ip,
      userAgent: input.userAgent,
      hashVersao: this.deps.hasher.sha256Hex(version.conteudoMarkdown),
    };

    await this.deps.legalDocumentAcceptanceRepository.append(acceptance);

    return ok(acceptance);
  }
}
