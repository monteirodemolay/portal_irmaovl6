import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';

export interface DeleteFamilyPersonDeps {
  familyPersonRepository: IFamilyPersonRepository;
  familyRelationshipRepository: IFamilyRelationshipRepository;
  clock: IClock;
}

/**
 * Remove um `FamilyPerson` cadastrado por engano ou duplicado — cobre o
 * caso "cadastrei a mesma pessoa duas vezes" (pedido do Administrador).
 * Nenhum repositório deste módulo expõe delete físico, então isto é sempre
 * `deletedAt != null` (mesmo padrão de `SoftDeleteFamilyRelationshipUseCase`).
 * Encadeia a remoção dos vínculos que apontam pra essa pessoa — sem isso,
 * o vínculo ficaria "fantasma", mostrando "Familiar sem dados cadastrados"
 * na tela de quem o criou.
 */
export class DeleteFamilyPersonUseCase {
  constructor(private readonly deps: DeleteFamilyPersonDeps) {}

  async execute(ctx: AuthContext, actingMemberId: string, personId: string): Promise<Result<void>> {
    const existing = await this.deps.familyPersonRepository.findById(personId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('FamilyPerson', personId));
    }
    if (existing.managedByMemberId !== actingMemberId) {
      return err(new ForbiddenError('familyLegacy:delete-not-owner'));
    }

    const now = this.deps.clock.now();

    await this.deps.familyPersonRepository.update({
      ...existing,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    const relationships = await this.deps.familyRelationshipRepository.listByEndpoint(
      ctx.tenantId,
      'familyPerson',
      personId,
    );
    for (const relation of relationships) {
      if (relation.deletedAt) continue;
      await this.deps.familyRelationshipRepository.update({
        ...relation,
        deletedAt: now,
        status: 'archived',
        ativo: false,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    return ok(undefined);
  }
}
