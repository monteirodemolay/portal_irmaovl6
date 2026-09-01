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
  PublicationSettings,
} from '../entities/publication-settings.entity';
import type { PublicationConsent } from '../entities/publication-consent.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IPublicationConsentRepository } from '../repositories/publication-consent.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface PublishMemberProfileBlocksInput {
  memberId: string;
  blocks: CentralBlockKey[];
  contacts: Array<keyof CentralContactVisibility>;
  externalLinks: Array<keyof CentralExternalLinksVisibility>;
}

export interface PublishMemberProfileBlocksDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  publicationConsentRepository: IPublicationConsentRepository;
  memberRepository: IMemberRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

const EMPTY_BLOCKS: Record<CentralBlockKey, boolean> = {
  apresentacao: false,
  informacoesPessoais: false,
  profissional: false,
  empresa: false,
  informacoesMaconicas: false,
  competencias: false,
  servicos: false,
  endereco: false,
  memoriaFotografica: false,
};
const EMPTY_CONTACTS: CentralContactVisibility = { telefone: false, whatsapp: false, email: false };
const EMPTY_LINKS: CentralExternalLinksVisibility = {
  whatsapp: false,
  instagram: false,
  facebook: false,
  linkedin: false,
  lattes: false,
  site: false,
};

/**
 * Dado o histórico completo (mais recente primeiro), decide se `key` está
 * autorizada agora: percorre do mais recente pro mais antigo e usa o
 * primeiro registro que menciona `key` num dos três grupos — `grant` ==
 * autorizado, `revoke` == não. Nunca menciona = nunca autorizado.
 */
function isAuthorized(
  key: string,
  group: 'blocksAuthorized' | 'contactsAuthorized' | 'externalLinksAuthorized',
  history: PublicationConsent[],
): boolean {
  for (const entry of history) {
    if ((entry[group] as string[]).includes(key)) {
      return entry.action === 'grant';
    }
  }
  return false;
}

/**
 * Publica blocos/contatos/redes especificamente autorizados via
 * `PublicationConsent` — o passo final do cadastro assistido (Fase 2,
 * docs/architecture). Só existe para o caminho `assisted_admin`: o
 * autoatendimento nunca passa por aqui, porque lá o próprio ato de ligar o
 * toggle em `UpdatePublicationSettingsUseCase` já É o consentimento. Rejeita
 * a chamada inteira (nada é publicado) se QUALQUER item pedido não tiver um
 * consentimento `grant` vigente (não revogado depois) cobrindo ele —
 * "publicar só o que foi explicitamente autorizado" é o requisito central
 * desta ação.
 */
export class PublishMemberProfileBlocksUseCase {
  private readonly recordAuditEntry: RecordAuditEntryUseCase;

  constructor(private readonly deps: PublishMemberProfileBlocksDeps) {
    this.recordAuditEntry = new RecordAuditEntryUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    input: PublishMemberProfileBlocksInput,
  ): Promise<Result<PublicationSettings>> {
    requirePermission(ctx, 'memberCentral:manage');

    const member = await this.deps.memberRepository.findById(input.memberId);
    if (!member || member.tenantId !== ctx.tenantId || member.deletedAt) {
      return err(new NotFoundError('Member', input.memberId));
    }

    if (
      input.blocks.length === 0 &&
      input.contacts.length === 0 &&
      input.externalLinks.length === 0
    ) {
      return err(new ValidationError('Selecione ao menos um item para publicar.'));
    }

    const history = await this.deps.publicationConsentRepository.listByMemberId(
      ctx.tenantId,
      member.id,
    );

    const unauthorizedBlock = input.blocks.find(
      (key) => !isAuthorized(key, 'blocksAuthorized', history),
    );
    if (unauthorizedBlock) {
      return err(
        new ValidationError(
          `O bloco "${unauthorizedBlock}" não tem consentimento registrado — registre o consentimento antes de publicar.`,
        ),
      );
    }
    const unauthorizedContact = input.contacts.find(
      (key) => !isAuthorized(key, 'contactsAuthorized', history),
    );
    if (unauthorizedContact) {
      return err(
        new ValidationError(
          `O contato "${unauthorizedContact}" não tem consentimento registrado — registre o consentimento antes de publicar.`,
        ),
      );
    }
    const unauthorizedLink = input.externalLinks.find(
      (key) => !isAuthorized(key, 'externalLinksAuthorized', history),
    );
    if (unauthorizedLink) {
      return err(
        new ValidationError(
          `A rede "${unauthorizedLink}" não tem consentimento registrado — registre o consentimento antes de publicar.`,
        ),
      );
    }

    const current = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    const now = this.deps.clock.now();

    const blocks = { ...(current?.blocks ?? EMPTY_BLOCKS) };
    input.blocks.forEach((key) => {
      blocks[key] = true;
    });
    const contacts = { ...(current?.contacts ?? EMPTY_CONTACTS) };
    input.contacts.forEach((key) => {
      contacts[key] = true;
    });
    const externalLinks = { ...(current?.externalLinks ?? EMPTY_LINKS) };
    input.externalLinks.forEach((key) => {
      externalLinks[key] = true;
    });

    const updated: PublicationSettings = current
      ? {
          ...current,
          blocks,
          contacts,
          externalLinks,
          profilePublished: true,
          updatedAt: now,
          updatedBy: ctx.uid,
        }
      : {
          id: this.deps.idGenerator.next(),
          tenantId: ctx.tenantId,
          memberId: member.id,
          profilePublished: true,
          blocks,
          contacts,
          externalLinks,
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

    await this.recordAuditEntry.execute({
      tenantId: ctx.tenantId,
      entidade: 'publicationSettings',
      entidadeId: updated.id,
      acao: 'member_profile_blocks_published',
      usuarioId: ctx.uid,
      ip: null,
      dispositivo: null,
      valorAnterior: current,
      valorNovo: updated,
    });

    return ok(updated);
  }
}
