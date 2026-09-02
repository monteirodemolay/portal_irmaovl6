import { describe, expect, it } from 'vitest';
import { classifyFamilyDisplayGroup, resolveRelationEndpoints } from './family-display-groups';

describe('classifyFamilyDisplayGroup', () => {
  it('classifica avô materno como ascendente', () => {
    expect(classifyFamilyDisplayGroup('Avô ou avó materno(a)')).toBe('ascendentes');
  });

  it('classifica neto como descendente', () => {
    expect(classifyFamilyDisplayGroup('Neto ou neta')).toBe('descendentes');
  });

  it('classifica cônjuge como família próxima', () => {
    expect(classifyFamilyDisplayGroup('Cônjuge')).toBe('familia_proxima');
  });

  it('classifica sogro como família por afinidade', () => {
    expect(classifyFamilyDisplayGroup('Sogro ou sogra')).toBe('familia_por_afinidade');
  });

  it('classifica primo como outros vínculos', () => {
    expect(classifyFamilyDisplayGroup('Primo ou prima')).toBe('outros_vinculos');
  });
});

describe('resolveRelationEndpoints', () => {
  const anchor = { kind: 'member' as const, id: 'luis' };
  const person = { kind: 'familyPerson' as const, id: 'mae-1' };

  it('mãe: a pessoa é a origem da relação parent_of', () => {
    const endpoints = resolveRelationEndpoints('mae', anchor, person);
    expect(endpoints).toMatchObject({
      fromKind: 'familyPerson',
      fromId: 'mae-1',
      toKind: 'member',
      toId: 'luis',
      relationKind: 'parent_of',
      parentRole: 'mae',
    });
  });

  it('filho_filha: a âncora é a origem da relação parent_of', () => {
    const endpoints = resolveRelationEndpoints('filho_filha', anchor, person);
    expect(endpoints).toMatchObject({
      fromKind: 'member',
      fromId: 'luis',
      toKind: 'familyPerson',
      toId: 'mae-1',
      relationKind: 'parent_of',
      childRole: 'descendente',
    });
  });

  it('conjuge: relação spouse_of com a âncora como origem', () => {
    const endpoints = resolveRelationEndpoints('conjuge', anchor, person);
    expect(endpoints.relationKind).toBe('spouse_of');
    expect(endpoints.fromId).toBe('luis');
  });

  it('outro: relação declared_kinship', () => {
    const endpoints = resolveRelationEndpoints('outro', anchor, person);
    expect(endpoints.relationKind).toBe('declared_kinship');
  });
});
