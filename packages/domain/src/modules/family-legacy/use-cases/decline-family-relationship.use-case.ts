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

export interface DeclineFamilyRelationshipDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  clock: IClock;
}

/**
 * Recusa não apaga o histórico — o vínculo permanece com `confirmationStatus:
 * 'declined'` (soft delete continua reservado pra "excluir", não pra
 * recusar), mesma leitura de 03_ARQUITETURA_E_DADOS.md.
 */
export class DeclineFamilyRelationshipUseCase {
  constructor(private readonly deps: DeclineFamilyRelationshipDeps) {}

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
      confirmationStatus: 'declined',
      confirmationNote: note,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.familyRelationshipRepository.update(updated);
    return ok(updated);
  }
}
