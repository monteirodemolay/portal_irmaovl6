import type { AuthContext } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { LegalDocumentKey } from '../entities/legal-document-version.entity';
import type { ILegalDocumentAcceptanceRepository } from '../repositories/legal-document-acceptance.repository';
import type { ILegalDocumentVersionRepository } from '../repositories/legal-document-version.repository';

export interface LegalAcceptanceStatus {
  documento: LegalDocumentKey;
  versaoVigente: string | null;
  versaoAceita: string | null;
  aceitoEm: Date | null;
  /** true quando existe versão vigente que exige novo aceite e o usuário ainda não aceitou essa versão. */
  pendente: boolean;
}

export interface GetLegalAcceptanceStatusDeps {
  legalDocumentVersionRepository: ILegalDocumentVersionRepository;
  legalDocumentAcceptanceRepository: ILegalDocumentAcceptanceRepository;
}

const DOCUMENTOS: LegalDocumentKey[] = ['politica_privacidade', 'termos_uso'];

/**
 * Situação de aceite do usuário logado para os dois documentos legais —
 * ação pessoal, sem `requirePermission` (mesmo padrão de "minhas
 * notificações"/"meus favoritos": o critério é ser o próprio usuário,
 * `ctx.uid`, nunca outro). Usado tanto pelo gate de reaceite quanto pela
 * área "Termos e Privacidade".
 */
export class GetLegalAcceptanceStatusUseCase {
  constructor(private readonly deps: GetLegalAcceptanceStatusDeps) {}

  async execute(ctx: AuthContext): Promise<Result<LegalAcceptanceStatus[]>> {
    const status = await Promise.all(
      DOCUMENTOS.map(async (documento): Promise<LegalAcceptanceStatus> => {
        const [vigente, aceite] = await Promise.all([
          this.deps.legalDocumentVersionRepository.findCurrent(ctx.tenantId, documento),
          this.deps.legalDocumentAcceptanceRepository.findLatestByUser(
            ctx.tenantId,
            ctx.uid,
            documento,
          ),
        ]);

        const pendente = Boolean(
          vigente && vigente.exigeNovoAceite && aceite?.versaoAceita !== vigente.versao,
        );

        return {
          documento,
          versaoVigente: vigente?.versao ?? null,
          versaoAceita: aceite?.versaoAceita ?? null,
          aceitoEm: aceite?.aceitoEm ?? null,
          pendente,
        };
      }),
    );

    return ok(status);
  }
}
