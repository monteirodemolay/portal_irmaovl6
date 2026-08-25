import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { BoardPositionAssignment } from '../../governance/entities/board-position-assignment.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { IBoardPositionAssignmentRepository } from '../../governance/repositories/board-position-assignment.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository, MemberSearchFilters } from '../repositories/member.repository';
import { SearchMembersUseCase } from './search-members.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['member:read'] };

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
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
    cargoAtualId: 'assignment-1',
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

function buildTerm(overrides: Partial<BoardTerm> = {}): BoardTerm {
  return {
    id: 'term-1',
    tenantId: 't1',
    nome: 'Gestão 2026',
    periodoInicio: new Date('2026-01-01'),
    periodoFim: new Date('2026-12-31'),
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

function buildAssignment(
  overrides: Partial<BoardPositionAssignment> = {},
): BoardPositionAssignment {
  return {
    id: 'assignment-1',
    tenantId: 't1',
    gestaoId: 'term-1',
    cargo: 'veneravel_mestre',
    memberId: 'member-1',
    ordem: 1,
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

class FakeMemberRepository implements Partial<IMemberRepository> {
  constructor(private readonly members: Member[]) {}
  lastFilters: MemberSearchFilters | null = null;
  async search(filters: MemberSearchFilters, _page: PageRequest): Promise<PageResult<Member>> {
    this.lastFilters = filters;
    return { items: this.members, nextCursor: null, hasMore: false };
  }
}

class FakeBoardTermRepository implements Partial<IBoardTermRepository> {
  constructor(private readonly term: BoardTerm | null) {}
  async findActive() {
    return this.term;
  }
}

class FakeAssignmentRepository implements Partial<IBoardPositionAssignmentRepository> {
  constructor(private readonly assignments: BoardPositionAssignment[]) {}
  async listByGestao() {
    return this.assignments;
  }
}

describe('SearchMembersUseCase', () => {
  it('busca sem filtro de cargo delega direto ao repositório', async () => {
    const memberRepo = new FakeMemberRepository([buildMember()]);
    const useCase = new SearchMembersUseCase({
      memberRepository: memberRepo as unknown as IMemberRepository,
      boardTermRepository: new FakeBoardTermRepository(null) as unknown as IBoardTermRepository,
      boardPositionAssignmentRepository: new FakeAssignmentRepository(
        [],
      ) as unknown as IBoardPositionAssignmentRepository,
    });

    const result = await useCase.execute(ctx, {}, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(memberRepo.lastFilters?.tenantId).toBe('t1');
  });

  it('filtra por cargo cruzando com os titulares da gestão vigente', async () => {
    const memberRepo = new FakeMemberRepository([
      buildMember({ id: 'member-1' }),
      buildMember({ id: 'member-2', nomeCompleto: 'Outro Irmão' }),
    ]);
    const useCase = new SearchMembersUseCase({
      memberRepository: memberRepo as unknown as IMemberRepository,
      boardTermRepository: new FakeBoardTermRepository(
        buildTerm(),
      ) as unknown as IBoardTermRepository,
      boardPositionAssignmentRepository: new FakeAssignmentRepository([
        buildAssignment({ memberId: 'member-1', cargo: 'veneravel_mestre' }),
      ]) as unknown as IBoardPositionAssignmentRepository,
    });

    const result = await useCase.execute(ctx, { cargo: 'veneravel_mestre' }, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('member-1');
  });

  it('retorna vazio quando não há gestão vigente e o cargo foi filtrado', async () => {
    const memberRepo = new FakeMemberRepository([buildMember()]);
    const useCase = new SearchMembersUseCase({
      memberRepository: memberRepo as unknown as IMemberRepository,
      boardTermRepository: new FakeBoardTermRepository(null) as unknown as IBoardTermRepository,
      boardPositionAssignmentRepository: new FakeAssignmentRepository(
        [],
      ) as unknown as IBoardPositionAssignmentRepository,
    });

    const result = await useCase.execute(ctx, { cargo: 'secretario' }, { limit: 20 });

    expect(result.items).toHaveLength(0);
  });
});
