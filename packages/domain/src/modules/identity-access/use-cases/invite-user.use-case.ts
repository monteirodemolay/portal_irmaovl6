import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { User } from '../entities/user.entity';
import type { IRoleRepository } from '../repositories/role.repository';
import type { IUserRepository } from '../repositories/user.repository';

export interface InviteUserInput {
  uid: string;
  email: string;
  roleId: string;
  memberId: string | null;
}

export interface InviteUserDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
  clock: IClock;
}

/**
 * Cria a conta `User` de um novo usuário do tenant. Pressupõe que a conta
 * no Firebase Auth (o `uid`) já foi criada por quem chama — este caso de
 * uso só grava o documento no Firestore. Requer `user:manage`.
 */
export class InviteUserUseCase {
  constructor(private readonly deps: InviteUserDeps) {}

  async execute(ctx: AuthContext, input: InviteUserInput): Promise<Result<User>> {
    requirePermission(ctx, 'user:manage');

    const [role, existing] = await Promise.all([
      this.deps.roleRepository.findById(input.roleId),
      this.deps.userRepository.findById(input.uid),
    ]);
    if (!role || role.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Role', input.roleId));
    }
    if (existing) {
      return err(new ConflictError('Já existe uma conta para este usuário.'));
    }

    const now = this.deps.clock.now();
    const user: User = {
      id: input.uid,
      tenantId: ctx.tenantId,
      email: input.email,
      memberId: input.memberId,
      roleId: input.roleId,
      mfaHabilitado: false,
      ultimoLogin: null,
      statusConta: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.userRepository.create(user);

    return ok(user);
  }
}
