import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';

export interface SoftDeleteFamilyRelationshipDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  clock: IClock;
}

/**
 * Nenhum repositório deste módulo expõe delete físico
 * (docs/architecture/03-modelo-dados.md §3.1 vale igualmente aqui) — remover
 * um vínculo é sempre `deletedAt != null`. Ação pessoal: só uma das partes
 * pode remover.
 */
export class SoftDeleteFamilyRelationshipUseCase {
  constructor(private readonly deps: SoftDeleteFamilyRelationshipDeps) {}

  async execute(
    ctx: AuthContext,
    actingMemberId: string,
    relationshipId: string,
  ): Promise<Result<void>> {
    const relation = await this.deps.familyRelationshipRepository.findById(relationshipId);
    if (!relation || relation.tenantId !== ctx.tenantId || relation.deletedAt) {
      return err(new NotFoundError('FamilyRelationship', relationshipId));
    }

    const isParty =
      (relation.fromKind === 'member' && relation.fromId === actingMemberId) ||
      (relation.toKind === 'member' && relation.toId === actingMemberId);
    if (!isParty) {
      return err(new ForbiddenError('familyLegacy:not-a-party'));
    }

    const now = this.deps.clock.now();
    await this.deps.familyRelationshipRepository.update({
      ...relation,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
