import type { PublicationSettingsInputValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IPublicationConsentRepository } from '../repositories/publication-consent.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import { keysTurnedOff, keysTurnedOn, someTrue } from './publication-settings-diff';

export interface UpdatePublicationSettingsDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  publicationConsentRepository: IPublicationConsentRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

const EMPTY_BLOCKS = {
  apresentacao: false,
  informacoesPessoais: false,
  profissional: false,
  empresa: false,
  informacoesMaconicas: false,
  competencias: false,
  servicos: false,
  endereco: false,
};
const EMPTY_CONTACTS = { telefone: false, whatsapp: false, email: false };
const EMPTY_LINKS = {
  whatsapp: false,
  instagram: false,
  facebook: false,
  linkedin: false,
  lattes: false,
  site: false,
};

/**
 * Decisão de VISIBILIDADE — nunca conteúdo (ver `UpdateCentralProfileUseCase`).
 * Ativar um bloco/campo que estava desligado é um consentimento novo e
 * explícito: gera um registro `PublicationConsent` (`grant`) listando
 * exatamente o que foi ligado nesta chamada — nunca "autorizo tudo".
 * Desligar algo gera o `revoke` correspondente. `profilePublished` só liga
 * sozinho (primeira publicação); desligar de vez é sempre uma ação
 * explícita separada (`WithdrawFromDirectoryUseCase`), nunca inferido daqui
 * — evita que salvar com tudo desligado pareça uma "retirada" acidental.
 */
export class UpdatePublicationSettingsUseCase {
  constructor(private readonly deps: UpdatePublicationSettingsDeps) {}

  async execute(
    ctx: AuthContext,
    input: PublicationSettingsInputValues,
    termoVersao: string,
  ): Promise<Result<PublicationSettings>> {
    requirePermission(ctx, 'memberCentral:update');

    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) {
      return err(new NotFoundError('Member', ctx.uid));
    }

    const current = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    const now = this.deps.clock.now();

    const previousBlocks = current?.blocks ?? EMPTY_BLOCKS;
    const previousContacts = current?.contacts ?? EMPTY_CONTACTS;
    const previousLinks = current?.externalLinks ?? EMPTY_LINKS;

    const grantedBlocks = keysTurnedOn(previousBlocks, input.blocks);
    const revokedBlocks = keysTurnedOff(previousBlocks, input.blocks);
    const grantedContacts = keysTurnedOn(previousContacts, input.contacts);
    const revokedContacts = keysTurnedOff(previousContacts, input.contacts);
    const grantedLinks = keysTurnedOn(previousLinks, input.externalLinks);
    const revokedLinks = keysTurnedOff(previousLinks, input.externalLinks);

    const anyVisible =
      someTrue(input.blocks) || someTrue(input.contacts) || someTrue(input.externalLinks);
    const profilePublished = (current?.profilePublished ?? false) || anyVisible;

    const updated: PublicationSettings = current
      ? {
          ...current,
          profilePublished,
          blocks: input.blocks,
          contacts: input.contacts,
          externalLinks: input.externalLinks,
          updatedAt: now,
          updatedBy: ctx.uid,
        }
      : {
          id: this.deps.idGenerator.next(),
          tenantId: ctx.tenantId,
          memberId: member.id,
          profilePublished,
          blocks: input.blocks,
          contacts: input.contacts,
          externalLinks: input.externalLinks,
          suspendedAt: null,
          suspendedBy: null,
          suspendedReason: null,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        };

    if (current) {
      await this.deps.publicationSettingsRepository.update(updated);
    } else {
      await this.deps.publicationSettingsRepository.create(updated);
    }

    if (grantedBlocks.length || grantedContacts.length || grantedLinks.length) {
      await this.deps.publicationConsentRepository.append({
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        memberId: member.id,
        termoVersao,
        acceptedAt: now,
        action: 'grant',
        blocksAuthorized: grantedBlocks,
        contactsAuthorized: grantedContacts,
        externalLinksAuthorized: grantedLinks,
      });
    }
    if (revokedBlocks.length || revokedContacts.length || revokedLinks.length) {
      await this.deps.publicationConsentRepository.append({
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        memberId: member.id,
        termoVersao,
        acceptedAt: now,
        action: 'revoke',
        blocksAuthorized: revokedBlocks,
        contactsAuthorized: revokedContacts,
        externalLinksAuthorized: revokedLinks,
      });
    }

    return ok(updated);
  }
}
