import type { MemberFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface RegisterMemberDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastra um novo Irmão. Cadastro simplificado: só `nomeCompleto` e `email`
 * são obrigatórios (`memberSchema`). `cim`, quando informado, precisa ser
 * único por tenant — docs/architecture/06-regras-negocio.md §6.1.
 */
export class RegisterMemberUseCase {
  constructor(private readonly deps: RegisterMemberDeps) {}

  async execute(ctx: AuthContext, input: MemberFormValues): Promise<Result<Member>> {
    requirePermission(ctx, 'member:create');

    if (input.cim) {
      const cimTaken = await this.deps.memberRepository.existsByCim(ctx.tenantId, input.cim);
      if (cimTaken) {
        return err(new ConflictError(`CIM "${input.cim}" já está em uso.`));
      }
    }

    const now = this.deps.clock.now();
    const member: Member = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: null,
      cargoAtualId: null,
      ...input,
      redesSociais: {
        instagram: input.redesSociais.instagram ?? null,
        facebook: input.redesSociais.facebook ?? null,
        linkedin: input.redesSociais.linkedin ?? null,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.memberRepository.create(member);

    return ok(member);
  }
}
