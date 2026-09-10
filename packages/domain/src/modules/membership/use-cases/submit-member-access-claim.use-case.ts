import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberAccessClaimRepository } from '../repositories/member-access-claim.repository';

export interface SubmitMemberAccessClaimDeps {
  memberRepository: IMemberRepository;
  memberAccessClaimRepository: IMemberAccessClaimRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Substitui `ClaimMemberAccountUseCase` — o par Nome (escolhido numa lista
 * pública de Irmãos ainda sem acesso) + CIM continua sendo a prova de
 * identidade, sem `AuthContext` (quem chama ainda não tem conta nenhuma).
 * A diferença: em vez de liberar o acesso na hora, isso só registra uma
 * `MemberAccessClaim` pendente — o acesso (conta Firebase Auth/`User`) só
 * nasce depois que um Administrador aprovar (`ApproveMemberAccessClaimUseCase`,
 * `member:manage`). Nunca grava o e-mail direto no `Member`: fica só na
 * solicitação até a aprovação, pra não contaminar o cadastro institucional
 * com um valor ainda não revisado.
 */
export class SubmitMemberAccessClaimUseCase {
  constructor(private readonly deps: SubmitMemberAccessClaimDeps) {}

  async execute(
    tenantId: string,
    memberId: string,
    cimConfirmacao: string,
    emailSolicitado: string,
    ip: string | null,
  ): Promise<Result<MemberAccessClaim>> {
    const member = await this.deps.memberRepository.findById(memberId);
    if (!member || member.tenantId !== tenantId || member.deletedAt) {
      return err(new NotFoundError('Member', memberId));
    }
    if (member.userId) {
      return err(new ValidationError('Este cadastro já tem um acesso vinculado.'));
    }
    // Mensagem genérica de propósito — não revela se o problema foi o
    // nome/CIM errado, dificultando tentativa por tentativa.
    if (!member.cim || member.cim !== cimConfirmacao.trim()) {
      return err(new ValidationError('Nome ou CIM não conferem com nenhum cadastro pendente.'));
    }

    const pending = await this.deps.memberAccessClaimRepository.findPendingByMember(
      tenantId,
      memberId,
    );
    if (pending) {
      return err(
        new ValidationError(
          'Já existe uma solicitação de acesso em análise para este cadastro. Aguarde a aprovação de um Administrador.',
        ),
      );
    }

    const now = this.deps.clock.now();
    const claim: MemberAccessClaim = {
      id: this.deps.idGenerator.next(),
      tenantId,
      memberId,
      emailSolicitado,
      ip,
      revisaoStatus: 'pendente',
      motivoRejeicao: null,
      revisadoPor: null,
      revisadoEm: null,
      createdAt: now,
      updatedAt: now,
      createdBy: 'self-claim',
      updatedBy: 'self-claim',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.memberAccessClaimRepository.create(claim);

    return ok(claim);
  }
}
