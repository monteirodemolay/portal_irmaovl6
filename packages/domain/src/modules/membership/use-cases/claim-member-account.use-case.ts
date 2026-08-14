import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { IClock } from '../../../shared/ports';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface ClaimMemberAccountDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

/**
 * Primeiro Use Case do domínio sem `AuthContext` — desvio deliberado do
 * padrão RBAC: quem chama ainda não tem uma conta, então não há permissão
 * a checar. A prova de identidade é conhecer o par Nome (escolhido numa
 * lista pública de Irmãos ainda sem acesso) + CIM cadastrado, não uma
 * permissão do sistema de papéis. Grava só o e-mail no `Member` — a
 * criação da conta Firebase Auth/`User` continua na Server Action
 * (`claimMemberAccountAction`), mesma divisão de responsabilidade que
 * `createPortalAccessForMember` já usa (infraestrutura fora do domínio).
 */
export class ClaimMemberAccountUseCase {
  constructor(private readonly deps: ClaimMemberAccountDeps) {}

  async execute(
    tenantId: string,
    memberId: string,
    cimConfirmacao: string,
    novoEmail: string,
  ): Promise<Result<Member>> {
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

    const updated: Member = {
      ...member,
      email: novoEmail,
      updatedAt: this.deps.clock.now(),
      // Sem `ctx.uid`: a conta Firebase Auth só nasce depois, na Server
      // Action, se este Use Case retornar sucesso.
      updatedBy: 'self-claim',
    };
    await this.deps.memberRepository.update(updated);

    return ok(updated);
  }
}
