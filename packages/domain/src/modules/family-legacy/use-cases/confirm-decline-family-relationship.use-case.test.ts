import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryFamilyRelationshipRepository } from '../../../test/fakes';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import { ConfirmFamilyRelationshipUseCase } from './confirm-family-relationship.use-case';
import { DeclineFamilyRelationshipUseCase } from './decline-family-relationship.use-case';

const ctx: AuthContext = { uid: 'user-1', tenantId: 't1', roleId: 'r1', permissions: [] };

function pendingRelationship(): FamilyRelationship {
  return {
    id: 'rel-1',
    tenantId: 't1',
    fromKind: 'member',
    fromId: 'luis',
    toKind: 'member',
    toId: 'outro-irmao',
    relationKind: 'sibling_of',
    parentRole: null,
    childRole: null,
    declaredLabel: null,
    lineageSide: 'unknown',
    confirmationStatus: 'pending',
    confirmedAt: null,
    confirmedBy: null,
    confirmationNote: null,
    visibility: 'private',
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    validFrom: null,
    validTo: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'luis',
    updatedBy: 'luis',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

describe('ConfirmFamilyRelationshipUseCase', () => {
  it('confirma o vínculo quando quem age é a outra ponta', async () => {
    const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
    await familyRelationshipRepository.create(pendingRelationship());
    const useCase = new ConfirmFamilyRelationshipUseCase({
      familyRelationshipRepository,
      clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    });

    const result = await useCase.execute(
      ctx,
      'outro-irmao',
      'rel-1',
      'Confirmo, é meu irmão de fato.',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.confirmationStatus).toBe('confirmed');
    expect(result.value.confirmedBy).toBe('outro-irmao');
  });

  it('rejeita confirmação de quem não é parte do vínculo', async () => {
    const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
    await familyRelationshipRepository.create(pendingRelationship());
    const useCase = new ConfirmFamilyRelationshipUseCase({
      familyRelationshipRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'estranho', 'rel-1', null);
    expect(result.ok).toBe(false);
  });
});

describe('DeclineFamilyRelationshipUseCase', () => {
  it('recusa sem excluir o histórico (soft delete continua null)', async () => {
    const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
    await familyRelationshipRepository.create(pendingRelationship());
    const useCase = new DeclineFamilyRelationshipUseCase({
      familyRelationshipRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(
      ctx,
      'outro-irmao',
      'rel-1',
      'Não reconheço esse vínculo.',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.confirmationStatus).toBe('declined');
    expect(result.value.deletedAt).toBeNull();
  });
});
