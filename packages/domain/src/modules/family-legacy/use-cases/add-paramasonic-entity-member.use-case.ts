import type { ParamasonicEntityMemberSituation } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, NotFoundError, ValidationError, ok, type Result } from '../../../shared/result';
import type { ParamasonicEntityMember } from '../entities/paramasonic-entity-member.entity';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface AddParamasonicEntityMemberInput {
  entityId: string;
  /** Preencha ou `memberId` (Irmão cadastrado) ou `nomeCompleto` (integrante do corpo próprio) — nunca os dois. */
  memberId: string | null;
  nomeCompleto: string | null;
  contato: string | null;
  cargo: string | null;
  situacao: ParamasonicEntityMemberSituation;
  dataIngresso: Date | null;
}

export interface AddParamasonicEntityMemberDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Adiciona um integrante a uma entidade paramaçônica — um Irmão cadastrado
 * que já ocupou/ocupa cargo nela (`memberId`) ou alguém do corpo próprio da
 * entidade (`nomeCompleto`), ver `ParamasonicEntityMember`.
 */
export class AddParamasonicEntityMemberUseCase {
  constructor(private readonly deps: AddParamasonicEntityMemberDeps) {}

  async execute(
    ctx: AuthContext,
    input: AddParamasonicEntityMemberInput,
  ): Promise<Result<ParamasonicEntityMember>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const entity = await this.deps.paramasonicEntityRepository.findById(input.entityId);
    if (!entity || entity.tenantId !== ctx.tenantId || entity.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', input.entityId));
    }

    if (!input.memberId && !input.nomeCompleto?.trim()) {
      return err(new ValidationError('Informe o Irmão cadastrado ou o nome do integrante.'));
    }
    if (input.memberId && input.nomeCompleto?.trim()) {
      return err(
        new ValidationError(
          'Escolha um Irmão cadastrado OU um integrante do corpo próprio, nunca os dois.',
        ),
      );
    }
    if (input.memberId) {
      const member = await this.deps.memberRepository.findById(input.memberId);
      if (!member || member.tenantId !== ctx.tenantId || member.deletedAt) {
        return err(new NotFoundError('Member', input.memberId));
      }
    }

    const now = this.deps.clock.now();
    const member: ParamasonicEntityMember = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      entityId: input.entityId,
      memberId: input.memberId,
      nomeCompleto: input.memberId ? null : input.nomeCompleto!.trim(),
      contato: input.memberId ? null : input.contato,
      cargo: input.cargo?.trim() || null,
      situacao: input.situacao,
      dataIngresso: input.dataIngresso,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.paramasonicEntityMemberRepository.create(member);
    return ok(member);
  }
}
