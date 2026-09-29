import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IUserRepository } from '../../identity-access/repositories/user.repository';
import type { LegalDocumentAcceptance } from '../entities/legal-document-acceptance.entity';
import type { ILegalDocumentAcceptanceRepository } from '../repositories/legal-document-acceptance.repository';

export interface ListLegalAcceptanceHistoryForUserDeps {
  legalDocumentAcceptanceRepository: ILegalDocumentAcceptanceRepository;
  userRepository: IUserRepository;
}

/**
 * Histórico completo de aceites (ambos os documentos, todas as versões já
 * aceitas) de um Irmão específico — tela de detalhe do painel administrativo,
 * para comprovação formal caso necessário (data, hora, versão, hash, IP/User-Agent, origem).
 */
export class ListLegalAcceptanceHistoryForUserUseCase {
  constructor(private readonly deps: ListLegalAcceptanceHistoryForUserDeps) {}

  async execute(ctx: AuthContext, userId: string): Promise<Result<LegalDocumentAcceptance[]>> {
    requirePermission(ctx, 'legalDocument:manage');

    const user = await this.deps.userRepository.findById(userId);
    if (!user || user.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('User', userId));
    }

    const history = await this.deps.legalDocumentAcceptanceRepository.listByUser(
      ctx.tenantId,
      userId,
    );
    return ok(history);
  }
}
