import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryFamilyRelationshipRepository } from '../../../test/fakes';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import { SoftDeleteFamilyRelationshipUseCase } from './soft-delete-family-relationship.use-case';

const ctx: AuthContext = { uid: 'user-1', tenantId: 't1', roleId: 'r1', permissions: [] };

function activeRelationship(): FamilyRelationship {
  return {
    id: 'rel-1',
    tenantId: 't1',
    fromKind: 'member',
    fromId: 'luis',
    toKind: 'familyPerson',
    toId: 'mae-1',
    relationKind: 'parent_of',
    parentRole: null,
    childRole: null,
    declaredLabel: null,
    lineageSide: 'unknown',
    confirmationStatus: 'not_required',
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

describe('SoftDeleteFamilyRelationshipUseCase', () => {
  it('faz soft delete (nunca remove fisicamente)', async () => {
    const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
    await familyRelationshipRepository.create(activeRelationship());
    const useCase = new SoftDeleteFamilyRelationshipUseCase({
      familyRelationshipRepository,
      clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, 'luis', 'rel-1');
    expect(result.ok).toBe(true);

    const stored = await familyRelationshipRepository.findById('rel-1');
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.status).toBe('archived');
    expect(stored?.ativo).toBe(false);
  });

  it('rejeita quem não é parte do vínculo', async () => {
    const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
    await familyRelationshipRepository.create(activeRelationship());
    const useCase = new SoftDeleteFamilyRelationshipUseCase({
      familyRelationshipRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'estranho', 'rel-1');
    expect(result.ok).toBe(false);
  });
});
