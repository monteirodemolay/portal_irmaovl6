import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { Member } from '../../membership/entities/member.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { Committee } from '../entities/committee.entity';
import type { ICommitteeRepository } from '../repositories/committee.repository';
import { UpdateCommitteeUseCase } from './update-committee.use-case';

const clock: IClock = { now: () => new Date('2026-02-01T00:00:00Z') };

function buildCommittee(overrides: Partial<Committee> = {}): Committee {
  return {
    id: 'committee-1',
    tenantId: 't1',
    gestaoId: 'term-1',
    nome: 'Comissão de Eventos',
    descricao: null,
    membrosIds: ['member-1'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'u1',
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@example.com',
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
    situacao: 'ativo',
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
    autorizaDivulgacaoExterna: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

class FakeCommitteeRepository implements Partial<ICommitteeRepository> {
  constructor(private readonly committee: Committee) {}
  updated: Committee | null = null;
  async findById() {
    return this.committee;
  }
  async update(committee: Committee) {
    this.updated = committee;
  }
}

class FakeMemberRepository implements Partial<IMemberRepository> {
  constructor(private readonly member: Member | null) {}
  async findByUserId() {
    return this.member;
  }
}

const input = { nome: 'Comissão de Eventos', descricao: 'Atualizada', membrosIds: ['member-1'] };

describe('UpdateCommitteeUseCase', () => {
  it('permite quando o usuário tem committee:manage, mesmo sem ser membro', async () => {
    const ctx: AuthContext = {
      uid: 'admin-uid',
      tenantId: 't1',
      roleId: 'r1',
      permissions: ['committee:manage'],
    };
    const repo = new FakeCommitteeRepository(buildCommittee());
    const useCase = new UpdateCommitteeUseCase({
      committeeRepository: repo as unknown as ICommitteeRepository,
      memberRepository: new FakeMemberRepository(null) as unknown as IMemberRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'committee-1', input);

    expect(result.ok).toBe(true);
    expect(repo.updated?.descricao).toBe('Atualizada');
  });

  it('permite quando o usuário é membro da comissão, mesmo sem committee:manage', async () => {
    const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };
    const repo = new FakeCommitteeRepository(buildCommittee({ membrosIds: ['member-1'] }));
    const useCase = new UpdateCommitteeUseCase({
      committeeRepository: repo as unknown as ICommitteeRepository,
      memberRepository: new FakeMemberRepository(buildMember()) as unknown as IMemberRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'committee-1', input);

    expect(result.ok).toBe(true);
    expect(repo.updated?.descricao).toBe('Atualizada');
  });

  it('rejeita quando o usuário não tem permissão nem é membro da comissão', async () => {
    const ctx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r1', permissions: [] };
    const repo = new FakeCommitteeRepository(buildCommittee({ membrosIds: ['member-1'] }));
    const useCase = new UpdateCommitteeUseCase({
      committeeRepository: repo as unknown as ICommitteeRepository,
      memberRepository: new FakeMemberRepository(
        buildMember({ id: 'member-2', userId: 'u2' }),
      ) as unknown as IMemberRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'committee-1', input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
    expect(repo.updated).toBeNull();
  });
});
