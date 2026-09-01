import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IPublicationConsentRepository } from '../repositories/publication-consent.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface WithdrawFromDirectoryDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  publicationConsentRepository: IPublicationConsentRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * "Retirar meu perfil da Central" — nunca "excluir cadastro" (Member/User
 * continuam intactos). Só `profilePublished` vira `false`; `blocks`/
 * `contacts`/`externalLinks` são preservados para o caso do Irmão querer
 * voltar depois sem reconfigurar tudo. Gera um `PublicationConsent` de
 * revogação total (docs/architecture, Central VL6).
 */
export class WithdrawFromDirectoryUseCase {
  constructor(private readonly deps: WithdrawFromDirectoryDeps) {}

  async execute(ctx: AuthContext): Promise<Result<PublicationSettings>> {
    requirePermission(ctx, 'memberCentral:update');

    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) {
      return err(new NotFoundError('Member', ctx.uid));
    }

    const current = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    if (!current) {
      return err(new NotFoundError('PublicationSettings', member.id));
    }

    const now = this.deps.clock.now();
    const updated: PublicationSettings = {
      ...current,
      profilePublished: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationSettingsRepository.update(updated);

    await this.deps.publicationConsentRepository.append({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: member.id,
      termoVersao: '-',
      acceptedAt: now,
      action: 'revoke',
      blocksAuthorized: [],
      contactsAuthorized: [],
      externalLinksAuthorized: [],
      source: 'self_service',
      recordedBy: ctx.uid,
      confirmationChannel: null,
      note: null,
    });

    return ok(updated);
  }
}
