import { describe, expect, it } from 'vitest';
import type { Member } from '@vl6/domain';
import { resolveMemberDisplayName } from './resolve-display-name';

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'uid-1',
    nomeCompleto: 'Luís Eduardo da Silva',
    fotoUrl: null,
    email: 'luis@vl6.org.br',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '001',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'regular',
    lojaId: 't1',
    potencia: 'GOB',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'seed',
    updatedBy: 'seed',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('resolveMemberDisplayName', () => {
  it('sem Member vinculado, usa o e-mail da conta', () => {
    expect(resolveMemberDisplayName(null, 'admin@vl6.org.br')).toBe('admin@vl6.org.br');
  });

  it('com Member vinculado, usa o nome completo', () => {
    expect(resolveMemberDisplayName(buildMember(), 'luis@vl6.org.br')).toBe('Luís Eduardo da Silva');
  });
});
