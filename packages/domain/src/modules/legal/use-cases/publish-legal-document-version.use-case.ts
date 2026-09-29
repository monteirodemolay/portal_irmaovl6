import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { IAuditLogRepository } from '../../audit/repositories/audit-log.repository';
import { RecordAuditEntryUseCase } from '../../audit/use-cases/record-audit-entry.use-case';
import type {
  LegalDocumentClassification,
  LegalDocumentImpact,
  LegalDocumentKey,
  LegalDocumentVersion,
} from '../entities/legal-document-version.entity';
import type { ILegalDocumentVersionRepository } from '../repositories/legal-document-version.repository';

export interface PublishLegalDocumentVersionInput {
  documento: LegalDocumentKey;
  versao: string;
  classificacao: LegalDocumentClassification;
  motivo: string;
  impacto: LegalDocumentImpact;
  itensAlterados: string[];
  exigeNovoAceite: boolean;
  conteudoMarkdown: string;
  diffResumo: string | null;
  responsavel: string;
}

export interface PublishLegalDocumentVersionDeps {
  legalDocumentVersionRepository: ILegalDocumentVersionRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Publica uma nova versão da Política de Privacidade ou dos Termos de Uso —
 * append-only, mesma natureza de `AuditLog`/`PublicationConsent`: nunca
 * sobrescreve uma versão anterior. Ver docs/legal/04-sistema-de-versionamento.md.
 *
 * Este Use Case NÃO dispara notificação aos usuários — isso é
 * responsabilidade da camada web (Server Action), que reaproveita o
 * mecanismo de notificação em massa já existente (`notifyAllActiveUsers`)
 * depois que a publicação for bem-sucedida, exatamente porque essa
 * responsabilidade é de apresentação/entrega, não de regra de negócio do
 * domínio.
 */
export class PublishLegalDocumentVersionUseCase {
  private readonly recordAuditEntry: RecordAuditEntryUseCase;

  constructor(private readonly deps: PublishLegalDocumentVersionDeps) {
    this.recordAuditEntry = new RecordAuditEntryUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    input: PublishLegalDocumentVersionInput,
  ): Promise<Result<LegalDocumentVersion>> {
    requirePermission(ctx, 'legalDocument:manage');

    const historico = await this.deps.legalDocumentVersionRepository.listByDocumento(
      ctx.tenantId,
      input.documento,
    );
    if (historico.some((v) => v.versao === input.versao)) {
      return err(new ConflictError(`A versão ${input.versao} já existe para este documento.`));
    }

    const now = this.deps.clock.now();
    const version: LegalDocumentVersion = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      documento: input.documento,
      versao: input.versao,
      classificacao: input.classificacao,
      motivo: input.motivo,
      impacto: input.impacto,
      itensAlterados: input.itensAlterados,
      exigeNovoAceite: input.exigeNovoAceite,
      conteudoMarkdown: input.conteudoMarkdown,
      diffResumo: input.diffResumo,
      autor: ctx.uid,
      responsavel: input.responsavel,
      publicadoEm: now,
    };

    await this.deps.legalDocumentVersionRepository.append(version);

    await this.recordAuditEntry.execute({
      tenantId: ctx.tenantId,
      entidade: 'legalDocumentVersions',
      entidadeId: version.id,
      acao: 'legal_document_version_published',
      usuarioId: ctx.uid,
      ip: null,
      dispositivo: null,
      valorAnterior: historico[0] ?? null,
      valorNovo: version,
    });

    return ok(version);
  }
}
