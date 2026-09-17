import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  err,
  ok,
  type Result,
} from '../../../shared/result';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';

export interface UpdateFamilyRelationshipLabelDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  clock: IClock;
}

/**
 * Corrige o texto de um parentesco declarado ("Bisavô", "Padrinho" etc.) já
 * cadastrado — só faz sentido para `relationKind === 'declared_kinship'`
 * (os demais tipos de vínculo direto, como "mãe"/"pai"/cônjuge, têm rótulo
 * calculado por `deriveKinships`, nunca texto livre). Pedido do
 * Administrador: "que possa ser editável o vínculo", sem precisar remover
 * e recriar a relação (o que perderia a data de criação/confirmação).
 */
export class UpdateFamilyRelationshipLabelUseCase {
  constructor(private readonly deps: UpdateFamilyRelationshipLabelDeps) {}

  async execute(
    ctx: AuthContext,
    actingMemberId: string,
    relationshipId: string,
    declaredLabel: string,
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

    if (relation.relationKind !== 'declared_kinship') {
      return err(
        new ConflictError('Este vínculo é calculado automaticamente e não tem texto editável.'),
      );
    }

    const updated: FamilyRelationship = {
      ...relation,
      declaredLabel,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.familyRelationshipRepository.update(updated);

    return ok(updated);
  }
}
