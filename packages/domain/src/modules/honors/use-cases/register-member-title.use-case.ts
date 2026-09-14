import type { MemberTitleKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { MemberTitle } from '../entities/member-title.entity';
import type { IMemberTitleRepository } from '../repositories/member-title.repository';

export interface RegisterMemberTitleInput {
  memberId: string;
  titulo: MemberTitleKey;
  tituloOutro: string | null;
  dataConcessao: Date | null;
  fundamento: string | null;
}

export interface RegisterMemberTitleDeps {
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastro de um Título ou Condição Maçônica do Irmão (Fase 1 do domínio de
 * Honrarias) — ver `MemberTitle`. Sempre uma ação da Secretaria/Administração,
 * nunca do próprio Irmão.
 */
export class RegisterMemberTitleUseCase {
  constructor(private readonly deps: RegisterMemberTitleDeps) {}

  async execute(ctx: AuthContext, input: RegisterMemberTitleInput): Promise<Result<MemberTitle>> {
    requirePermission(ctx, 'honor:manage');

    const now = this.deps.clock.now();
    const title: MemberTitle = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: input.memberId,
      titulo: input.titulo,
      tituloOutro: input.titulo === 'outro' ? input.tituloOutro : null,
      dataConcessao: input.dataConcessao,
      fundamento: input.fundamento,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.memberTitleRepository.create(title);

    return ok(title);
  }
}
