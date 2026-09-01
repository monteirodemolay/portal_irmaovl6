import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { IAuditLogRepository } from '../../audit/repositories/audit-log.repository';
import { RecordAuditEntryUseCase } from '../../audit/use-cases/record-audit-entry.use-case';
import type {
  CentralBlockKey,
  CentralContactVisibility,
  CentralExternalLinksVisibility,
} from '../entities/publication-settings.entity';
import type {
  ConsentConfirmationChannel,
  PublicationConsent,
} from '../entities/publication-consent.entity';
import type { IPublicationConsentRepository } from '../repositories/publication-consent.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface RecordMemberProfileConsentInput {
  memberId: string;
  termoVersao: string;
  confirmationChannel: ConsentConfirmationChannel;
  note: string | null;
  blocksAuthorized: CentralBlockKey[];
  contactsAuthorized: Array<keyof CentralContactVisibility>;
  externalLinksAuthorized: Array<keyof CentralExternalLinksVisibility>;
}

export interface RecordMemberProfileConsentDeps {
  publicationConsentRepository: IPublicationConsentRepository;
  memberRepository: IMemberRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Registra que a Administração confirmou, com o titular, a autorização para
 * publicar blocos específicos — passo obrigatório do cadastro assistido
 * ANTES de `PublishMemberProfileBlocksUseCase` poder ligar qualquer coisa
 * (Fase 2, docs/architecture). Nunca aceita `source` como input — é sempre
 * `assisted_admin`, fixado aqui dentro; não existe nenhum parâmetro pelo
 * qual o client possa forjar `self_service` a partir deste caminho
 * administrativo ("Não é possível forjar origem self_service em action
 * administrativa" — requisito de aceite). O consentimento self_service
 * continua existindo só pelo caminho próprio do titular
 * (`UpdatePublicationSettingsUseCase`/`WithdrawFromDirectoryUseCase`).
 */
export class RecordMemberProfileConsentUseCase {
  private readonly recordAuditEntry: RecordAuditEntryUseCase;

  constructor(private readonly deps: RecordMemberProfileConsentDeps) {
    this.recordAuditEntry = new RecordAuditEntryUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    input: RecordMemberProfileConsentInput,
  ): Promise<Result<PublicationConsent>> {
    requirePermission(ctx, 'memberCentral:manage');

    const member = await this.deps.memberRepository.findById(input.memberId);
    if (!member || member.tenantId !== ctx.tenantId || member.deletedAt) {
      return err(new NotFoundError('Member', input.memberId));
    }

    if (
      input.blocksAuthorized.length === 0 &&
      input.contactsAuthorized.length === 0 &&
      input.externalLinksAuthorized.length === 0
    ) {
      return err(
        new ValidationError('Selecione ao menos um bloco, contato ou rede para autorizar.'),
      );
    }

    const now = this.deps.clock.now();
    const consent: PublicationConsent = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: member.id,
      termoVersao: input.termoVersao,
      acceptedAt: now,
      action: 'grant',
      blocksAuthorized: input.blocksAuthorized,
      contactsAuthorized: input.contactsAuthorized,
      externalLinksAuthorized: input.externalLinksAuthorized,
      source: 'assisted_admin',
      recordedBy: ctx.uid,
      confirmationChannel: input.confirmationChannel,
      note: input.note,
    };

    await this.deps.publicationConsentRepository.append(consent);

    await this.recordAuditEntry.execute({
      tenantId: ctx.tenantId,
      entidade: 'publicationConsents',
      entidadeId: consent.id,
      acao: 'member_profile_consent_recorded',
      usuarioId: ctx.uid,
      ip: null,
      dispositivo: null,
      valorAnterior: null,
      valorNovo: consent,
    });

    return ok(consent);
  }
}
