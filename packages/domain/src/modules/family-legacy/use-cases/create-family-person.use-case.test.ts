import { describe, expect, it } from 'vitest';
import type { FamilyPersonFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryFamilyPersonRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateFamilyPersonUseCase } from './create-family-person.use-case';

const ctx: AuthContext = { uid: 'user-1', tenantId: 't1', roleId: 'r1', permissions: [] };

function baseInput(): FamilyPersonFormValues {
  return {
    linkedMemberId: null,
    nomeCompleto: 'João da Silva Neto',
    fotoUrl: null,
    dataNascimento: null,
    dataFalecimento: null,
    lifeStatus: 'living',
    cidade: null,
    estado: null,
    pais: null,
    biografia: null,
    menorDeIdade: false,
    fraternalLinkStatus: 'none',
    visibility: 'private',
    sourceKind: 'self_declaration',
    sourceDescription: null,
  };
}

function buildUseCase() {
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const useCase = new CreateFamilyPersonUseCase({
    familyPersonRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, familyPersonRepository };
}

describe('CreateFamilyPersonUseCase', () => {
  it('cria familiar privado', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute(ctx, 'member-1', baseInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.visibility).toBe('private');
    expect(result.value.managedByMemberId).toBe('member-1');
  });

  it('cria filho ou filha sem vínculo maçônico ou paramaçônico', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute(ctx, 'member-1', {
      ...baseInput(),
      nomeCompleto: 'Maria Filha',
      fraternalLinkStatus: 'none',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nomeCompleto).toBe('Maria Filha');
    expect(result.value.fraternalLinkStatus).toBe('none');
  });

  it('mantém distintos os estados sem vínculo, desconhecido e possui vínculo', async () => {
    const { useCase } = buildUseCase();
    const none = await useCase.execute(ctx, 'm1', { ...baseInput(), fraternalLinkStatus: 'none' });
    const unknown = await useCase.execute(ctx, 'm1', {
      ...baseInput(),
      fraternalLinkStatus: 'unknown',
    });
    const has = await useCase.execute(ctx, 'm1', {
      ...baseInput(),
      fraternalLinkStatus: 'has_affiliation',
    });

    expect(none.ok && none.value.fraternalLinkStatus).toBe('none');
    expect(unknown.ok && unknown.value.fraternalLinkStatus).toBe('unknown');
    expect(has.ok && has.value.fraternalLinkStatus).toBe('has_affiliation');
  });

  it('recalcula menorDeIdade a partir da data de nascimento e rebaixa a visibilidade se necessário', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute(ctx, 'member-1', {
      ...baseInput(),
      dataNascimento: new Date('2015-01-01'), // 11 anos em 2026-06-01
      menorDeIdade: false, // formulário mentindo — servidor recalcula
      visibility: 'members',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.menorDeIdade).toBe(true);
    expect(result.value.visibility).toBe('private');
  });

  it('faz soft delete por padrão nunca — nasce ativo e sem deletedAt', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute(ctx, 'member-1', baseInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toBeNull();
    expect(result.value.ativo).toBe(true);
  });
});
