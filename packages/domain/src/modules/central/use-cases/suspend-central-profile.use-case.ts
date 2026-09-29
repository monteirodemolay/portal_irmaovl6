import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import { resolveEffectivePublication } from '../lib/resolve-effective-publication';

export interface SuspendCentralProfileDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Moderação administrativa — congela a exibição sem apagar a configuração
 * do titular (reverter não exige reconfigurar nada). Nunca mexe em
 * `profilePublished`/`blocks`/`contacts`/`externalLinks` — essa fronteira é
 * reforçada de novo na Security Rule (defesa em profundidade real, não
 * decorativa). Motivo é obrigatório: fica registrado quem, quando e por quê
 * (requisito de auditoria da Central).
 *
 * Quem nunca abriu a aba "Privacidade" não tem `PublicationSettings` — mas
 * está publicado do mesmo jeito (padrão aberto, ver
 * `resolveEffectivePublication`), então também precisa poder ser suspenso.
 * Cria o registro na hora, já com o efetivo atual (tudo aberto) preservado,
 * só ligando a suspensão por cima — reverter depois volta pro mesmo aberto
 * de sempre, sem inventar um "fechado" que o titular nunca escolheu.
 */
export class SuspendCentralProfileUseCase {
  constructor(private readonly deps: SuspendCentralProfileDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    motivo: string,
  ): Promise<Result<PublicationSettings>> {
    requirePermission(ctx, 'memberCentral:manage');

    if (!motivo.trim()) {
      return err(new ValidationError('Motivo da suspensão é obrigatório.'));
    }

    const existing = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      memberId,
    );

    const now = this.deps.clock.now();

    if (!existing) {
      const member = await this.deps.memberRepository.findById(memberId);
      if (!member || member.tenantId !== ctx.tenantId) {
        return err(new NotFoundError('Member', memberId));
      }
      const effective = resolveEffectivePublication(null);
      const created: PublicationSettings = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        memberId,
        profilePublished: effective.open,
        blocks: effective.blocks,
        contacts: effective.contacts,
        externalLinks: effective.externalLinks,
        suspendedAt: now,
        suspendedBy: ctx.uid,
        suspendedReason: motivo.trim(),
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.publicationSettingsRepository.create(created);
      return ok(created);
    }

    const updated: PublicationSettings = {
      ...existing,
      suspendedAt: now,
      suspendedBy: ctx.uid,
      suspendedReason: motivo.trim(),
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationSettingsRepository.update(updated);

    return ok(updated);
  }
}
