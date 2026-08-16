import type { ArchiveContributionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import type { IArchiveContributionRepository } from '../repositories/archive-contribution.repository';

export interface SubmitArchiveContributionDeps {
  archiveContributionRepository: IArchiveContributionRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface SubmitArchiveContributionInput extends ArchiveContributionFormValues {
  arquivoUrl: string | null;
  tamanhoBytes: number | null;
}

/**
 * Envio de uma contribuição por um Irmão — ação pessoal, sem
 * `requirePermission` (mesmo padrão de "favoritar", `toggle-library-favorite`):
 * qualquer sessão de membro autenticado pode enviar. Nasce sempre em
 * `moderacaoStatus: 'pendente'`; moderar é ação separada
 * (`ModerateArchiveContributionUseCase`, gated por `archiveContribution:manage`).
 */
export class SubmitArchiveContributionUseCase {
  constructor(private readonly deps: SubmitArchiveContributionDeps) {}

  async execute(
    ctx: AuthContext,
    input: SubmitArchiveContributionInput,
  ): Promise<Result<ArchiveContribution>> {
    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) return err(new NotFoundError('Member', ctx.uid));

    const now = this.deps.clock.now();
    const contribution: ArchiveContribution = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: member.id,
      titulo: input.titulo,
      descricao: input.descricao,
      tipo: input.tipo,
      arquivoUrl: input.arquivoUrl,
      tamanhoBytes: input.tamanhoBytes,
      moderacaoStatus: 'pendente',
      motivoRejeicao: null,
      moderadoPor: null,
      moderadoEm: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveContributionRepository.create(contribution);
    return ok(contribution);
  }
}
