import { describe, expect, it } from 'vitest';
import {
  familyPersonSchema,
  familyRelationshipSchema,
  personFraternalRecordSchema,
} from './family-legacy.schema';

function basePerson() {
  return {
    linkedMemberId: null,
    nomeCompleto: 'Maria da Silva',
    fotoUrl: null,
    dataNascimento: null,
    dataFalecimento: null,
    lifeStatus: 'living' as const,
    cidade: null,
    estado: null,
    pais: null,
    biografia: null,
    menorDeIdade: false,
    fraternalLinkStatus: 'none' as const,
    visibility: 'private' as const,
    sourceKind: 'self_declaration' as const,
    sourceDescription: null,
  };
}

function baseRelationship() {
  return {
    fromKind: 'member' as const,
    fromId: 'member-1',
    toKind: 'familyPerson' as const,
    toId: 'person-1',
    relationKind: 'parent_of' as const,
    parentRole: 'mae' as const,
    childRole: null,
    declaredLabel: null,
    visibility: 'private' as const,
    sourceKind: 'self_declaration' as const,
    sourceDescription: null,
  };
}

function baseFraternalRecord() {
  return {
    personKind: 'familyPerson' as const,
    personId: 'person-1',
    affiliationKind: 'demolay' as const,
    organizacaoNome: null,
    unidadeTipo: 'chapter' as const,
    unidadeNome: 'Capítulo Exemplo',
    unidadeNumero: '12',
    cidade: null,
    estado: null,
    pais: null,
    potencia: null,
    rito: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    grau: null,
    cargos: [],
    titulos: [],
    passouAoOrienteEternoEm: null,
    resumoLegado: null,
    visibility: 'private' as const,
    sourceKind: 'self_declaration' as const,
    sourceDescription: null,
    reviewStatus: 'draft' as const,
  };
}

describe('familyPersonSchema', () => {
  it('aceita um familiar sem qualquer vínculo maçônico ou paramaçônico', () => {
    const result = familyPersonSchema.safeParse({ ...basePerson(), fraternalLinkStatus: 'none' });
    expect(result.success).toBe(true);
  });

  it('rejeita falecimento anterior ao nascimento', () => {
    const result = familyPersonSchema.safeParse({
      ...basePerson(),
      dataNascimento: new Date('2000-01-01'),
      dataFalecimento: new Date('1990-01-01'),
    });
    expect(result.success).toBe(false);
  });

  it('recusa publicação de menor de idade', () => {
    const result = familyPersonSchema.safeParse({
      ...basePerson(),
      menorDeIdade: true,
      visibility: 'members',
    });
    expect(result.success).toBe(false);
  });

  it('permite menor de idade em visibilidade privada', () => {
    const result = familyPersonSchema.safeParse({
      ...basePerson(),
      menorDeIdade: true,
      visibility: 'private',
    });
    expect(result.success).toBe(true);
  });

  it('exige fonte para publicação no Acervo (Memorial)', () => {
    const result = familyPersonSchema.safeParse({
      ...basePerson(),
      visibility: 'archive',
      sourceKind: 'document',
      sourceDescription: null,
    });
    expect(result.success).toBe(false);
  });

  it('aceita publicação no Acervo com fonte descrita', () => {
    const result = familyPersonSchema.safeParse({
      ...basePerson(),
      visibility: 'archive',
      sourceKind: 'document',
      sourceDescription: 'Certidão de óbito digitalizada.',
    });
    expect(result.success).toBe(true);
  });
});

describe('familyRelationshipSchema', () => {
  it('rejeita relação de uma pessoa consigo mesma', () => {
    const result = familyRelationshipSchema.safeParse({
      ...baseRelationship(),
      fromKind: 'member',
      fromId: 'member-1',
      toKind: 'member',
      toId: 'member-1',
    });
    expect(result.success).toBe(false);
  });

  it('exige rótulo declarado para parentesco declarado', () => {
    const result = familyRelationshipSchema.safeParse({
      ...baseRelationship(),
      relationKind: 'declared_kinship',
      declaredLabel: null,
    });
    expect(result.success).toBe(false);
  });

  it('aceita parentesco declarado com rótulo informado', () => {
    const result = familyRelationshipSchema.safeParse({
      ...baseRelationship(),
      relationKind: 'declared_kinship',
      declaredLabel: 'Padrinho',
    });
    expect(result.success).toBe(true);
  });
});

describe('personFraternalRecordSchema', () => {
  it('aceita mais de uma organização paramaçônica para a mesma pessoa (múltiplos registros são criados em chamadas separadas)', () => {
    const result = personFraternalRecordSchema.safeParse(baseFraternalRecord());
    expect(result.success).toBe(true);
  });

  it('rejeita afiliação fora do vocabulário fechado', () => {
    const result = personFraternalRecordSchema.safeParse({
      ...baseFraternalRecord(),
      affiliationKind: 'clube-do-bolinha',
    });
    expect(result.success).toBe(false);
  });
});
