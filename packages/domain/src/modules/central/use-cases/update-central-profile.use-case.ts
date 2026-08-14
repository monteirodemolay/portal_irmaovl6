import type { MemberCentralProfileValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface UpdateCentralProfileDeps {
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Salva o CONTEÚDO dos blocos da Central — nunca mexe em visibilidade
 * (ver `UpdatePublicationSettingsUseCase`, uma decisão separada;
 * "cadastrar ≠ publicar"). `memberId` nunca vem de input — sempre resolvido
 * da própria sessão (`findByUserId`), então não há como um Irmão editar o
 * perfil de outro só trocando um parâmetro. Cria o documento sob demanda na
 * primeira vez (lazy) — sem backfill necessário pros Irmãos já cadastrados.
 */
export class UpdateCentralProfileUseCase {
  constructor(private readonly deps: UpdateCentralProfileDeps) {}

  async execute(
    ctx: AuthContext,
    input: MemberCentralProfileValues,
  ): Promise<Result<MemberCentralProfile>> {
    requirePermission(ctx, 'memberCentral:update');

    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) {
      return err(new NotFoundError('Member', ctx.uid));
    }

    const current = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    const now = this.deps.clock.now();

    const updated: MemberCentralProfile = current
      ? { ...current, ...input, updatedAt: now, updatedBy: ctx.uid }
      : {
          id: this.deps.idGenerator.next(),
          tenantId: ctx.tenantId,
          memberId: member.id,
          ...input,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        };

    if (current) {
      await this.deps.memberCentralProfileRepository.update(updated);
    } else {
      await this.deps.memberCentralProfileRepository.create(updated);
    }

    return ok(updated);
  }
}
