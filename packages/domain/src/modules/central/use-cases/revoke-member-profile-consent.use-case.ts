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
import type { PublicationConsent } from '../entities/publication-consent.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IPublicationConsentRepository } from '../repositories/publication-consent.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface RevokeMemberProfileConsentInput {
  memberId: string;
  termoVersao: string;
  note: string | null;
  blocksRevoked: CentralBlockKey[];
  contactsRevoked: Array<keyof CentralContactVisibility>;
  externalLinksRevoked: Array<keyof CentralExternalLinksVisibility>;
}

export interface RevokeMemberProfileConsentDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  publicationConsentRepository: IPublicationConsentRepository;
  memberRepository: IMemberRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Revoga, no fluxo assistido, o consentimento de itens específicos — e
 * ESCONDE esses itens imediatamente (nunca só registra o histórico e deixa a
 * exibição desatualizada). Mesma natureza de "desligar um toggle" em
 * `UpdatePublicationSettingsUseCase`, só que disparada pela Administração em
 * nome do titular, sempre `source: 'assisted_admin'` — nunca aceita
 * `source` como input.
 */
export class RevokeMemberProfileConsentUseCase {
  private readonly recordAuditEntry: RecordAuditEntryUseCase;

  constructor(private readonly deps: RevokeMemberProfileConsentDeps) {
    this.recordAuditEntry = new RecordAuditEntryUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    input: RevokeMemberProfileConsentInput,
  ): Promise<Result<PublicationConsent>> {
    requirePermission(ctx, 'memberCentral:manage');

    const member = await this.deps.memberRepository.findById(input.memberId);
    if (!member || member.tenantId !== ctx.tenantId || member.deletedAt) {
      return err(new NotFoundError('Member', input.memberId));
    }

    if (
      input.blocksRevoked.length === 0 &&
      input.contactsRevoked.length === 0 &&
      input.externalLinksRevoked.length === 0
    ) {
      return err(new ValidationError('Selecione ao menos um item para revogar.'));
    }

    const now = this.deps.clock.now();

    const settings = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    if (settings) {
      const blocks = { ...settings.blocks };
      input.blocksRevoked.forEach((key) => {
        blocks[key] = false;
      });
      const contacts = { ...settings.contacts };
      input.contactsRevoked.forEach((key) => {
        contacts[key] = false;
      });
      const externalLinks = { ...settings.externalLinks };
      input.externalLinksRevoked.forEach((key) => {
        externalLinks[key] = false;
      });
      await this.deps.publicationSettingsRepository.update({
        ...settings,
        blocks,
        contacts,
        externalLinks,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    const consent: PublicationConsent = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: member.id,
      termoVersao: input.termoVersao,
      acceptedAt: now,
      action: 'revoke',
      blocksAuthorized: input.blocksRevoked,
      contactsAuthorized: input.contactsRevoked,
      externalLinksAuthorized: input.externalLinksRevoked,
      source: 'assisted_admin',
      recordedBy: ctx.uid,
      confirmationChannel: null,
      note: input.note,
    };
    await this.deps.publicationConsentRepository.append(consent);

    await this.recordAuditEntry.execute({
      tenantId: ctx.tenantId,
      entidade: 'publicationConsents',
      entidadeId: consent.id,
      acao: 'member_profile_consent_revoked',
      usuarioId: ctx.uid,
      ip: null,
      dispositivo: null,
      valorAnterior: null,
      valorNovo: consent,
    });

    return ok(consent);
  }
}
