import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IUserRepository } from '../../identity-access/repositories/user.repository';
import type { LegalDocumentKey } from '../entities/legal-document-version.entity';
import type { ILegalDocumentAcceptanceRepository } from '../repositories/legal-document-acceptance.repository';
import type { ILegalDocumentVersionRepository } from '../repositories/legal-document-version.repository';

export interface LegalAcceptanceOverviewDocStatus {
  versaoVigente: string | null;
  versaoAceita: string | null;
  aceitoEm: Date | null;
  pendente: boolean;
}

export interface LegalAcceptanceOverviewRow {
  userId: string;
  email: string;
  nomeCompleto: string | null;
  porDocumento: Record<LegalDocumentKey, LegalAcceptanceOverviewDocStatus>;
}

export interface ListLegalAcceptanceOverviewDeps {
  legalDocumentVersionRepository: ILegalDocumentVersionRepository;
  legalDocumentAcceptanceRepository: ILegalDocumentAcceptanceRepository;
  userRepository: IUserRepository;
  memberRepository: IMemberRepository;
}

const DOCUMENTOS: LegalDocumentKey[] = ['politica_privacidade', 'termos_uso'];

/**
 * Visão geral (painel administrativo) de quem já aceitou a Política de
 * Privacidade e os Termos de Uso vigentes — uma linha por conta de acesso do
 * tenant. Busca todos os aceites de uma vez (`listByTenant`) em vez de uma
 * consulta por usuário, para não fazer N chamadas ao Firestore numa tela que
 * lista todo o quadro de Irmãos.
 */
export class ListLegalAcceptanceOverviewUseCase {
  constructor(private readonly deps: ListLegalAcceptanceOverviewDeps) {}

  async execute(ctx: AuthContext): Promise<Result<LegalAcceptanceOverviewRow[]>> {
    requirePermission(ctx, 'legalDocument:manage');

    const [users, acceptances, ...versoesVigentes] = await Promise.all([
      this.deps.userRepository.listByTenant(ctx.tenantId),
      this.deps.legalDocumentAcceptanceRepository.listByTenant(ctx.tenantId),
      ...DOCUMENTOS.map((documento) =>
        this.deps.legalDocumentVersionRepository.findCurrent(ctx.tenantId, documento),
      ),
    ]);

    const vigentePorDocumento: Record<LegalDocumentKey, string | null> = {
      politica_privacidade: versoesVigentes[0]?.versao ?? null,
      termos_uso: versoesVigentes[1]?.versao ?? null,
    };

    // `listByTenant` já vem ordenado por `aceitoEm desc` — a primeira
    // ocorrência de cada par (userId, documento) é sempre a mais recente.
    const latestByUserAndDoc = new Map<string, (typeof acceptances)[number]>();
    for (const acceptance of acceptances) {
      const key = `${acceptance.userId}:${acceptance.documento}`;
      if (!latestByUserAndDoc.has(key)) {
        latestByUserAndDoc.set(key, acceptance);
      }
    }

    const members = await Promise.all(
      users.map((user) => this.deps.memberRepository.findByUserId(ctx.tenantId, user.id)),
    );

    const rows: LegalAcceptanceOverviewRow[] = users.map((user, index) => {
      const porDocumento = Object.fromEntries(
        DOCUMENTOS.map((documento) => {
          const latest = latestByUserAndDoc.get(`${user.id}:${documento}`) ?? null;
          const vigente = vigentePorDocumento[documento];
          const pendente = Boolean(vigente && latest?.versaoAceita !== vigente);
          const status: LegalAcceptanceOverviewDocStatus = {
            versaoVigente: vigente,
            versaoAceita: latest?.versaoAceita ?? null,
            aceitoEm: latest?.aceitoEm ?? null,
            pendente,
          };
          return [documento, status];
        }),
      ) as Record<LegalDocumentKey, LegalAcceptanceOverviewDocStatus>;

      return {
        userId: user.id,
        email: user.email,
        nomeCompleto: members[index]?.nomeCompleto ?? null,
        porDocumento,
      };
    });

    rows.sort((a, b) => (a.nomeCompleto ?? a.email).localeCompare(b.nomeCompleto ?? b.email));

    return ok(rows);
  }
}
