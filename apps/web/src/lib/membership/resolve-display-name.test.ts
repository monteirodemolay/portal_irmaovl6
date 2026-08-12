import { describe, expect, it } from 'vitest';
import type { Member } from '@vl6/domain';
import { resolveMemberDisplayName } from './resolve-display-name';

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'uid-1',
    nomeCompleto: 'Luís Eduardo da Silva',
    nomeMaconico: null,
    fotoUrl: null,
    email: 'luis@vl6.org.br',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    matricula: '001',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'regular',
    lojaId: 't1',
    potencia: 'GOB',
    profissao: null,
    empresa: null,
    estadoCivil: null,
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

  it('sem nome maçônico, usa o nome completo', () => {
    expect(resolveMemberDisplayName(buildMember(), 'luis@vl6.org.br')).toBe('Luís Eduardo da Silva');
  });

  it('com nome maçônico, ele tem prioridade', () => {
    expect(
      resolveMemberDisplayName(buildMember({ nomeMaconico: 'Irmão Luís' }), 'luis@vl6.org.br'),
    ).toBe('Irmão Luís');
  });
});
