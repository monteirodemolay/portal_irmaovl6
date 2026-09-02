import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  err,
  ok,
  type Result,
} from '../../../shared/result';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';

export interface ConfirmFamilyRelationshipDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  clock: IClock;
}

/**
 * Confirmação entre Irmãos (04_TELAS_E_FLUXOS.md §4) — só quem é a outra
 * ponta do vínculo (não quem o criou) pode confirmar, e só quando o estado
 * já é `pending`.
 */
export class ConfirmFamilyRelationshipUseCase {
  constructor(private readonly deps: ConfirmFamilyRelationshipDeps) {}

  async execute(
    ctx: AuthContext,
    actingMemberId: string,
    relationshipId: string,
    note: string | null,
  ): Promise<Result<FamilyRelationship>> {
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

    if (relation.confirmationStatus !== 'pending') {
      return err(new ConflictError('Esse vínculo não está aguardando confirmação.'));
    }

    const now = this.deps.clock.now();
    const updated: FamilyRelationship = {
      ...relation,
      confirmationStatus: 'confirmed',
      confirmedAt: now,
      confirmedBy: actingMemberId,
      confirmationNote: note,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.familyRelationshipRepository.update(updated);
    return ok(updated);
  }
}
