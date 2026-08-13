import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryCommitteeRepository, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { Committee } from '../entities/committee.entity';
import { ListCommitteesByGestaoUseCase, ListMyCommitteesUseCase } from './list-committees.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['committee:read'],
};

const forbiddenCtx: AuthContext = {
  uid: 'user-2',
  tenantId: 't1',
  roleId: 'r2',
  permissions: [],
};

function buildCommittee(id: string, gestaoId: string, membrosIds: string[]): Committee {
  return {
    id,
    tenantId: 't1',
    gestaoId,
    nome: `Comissão ${id}`,
    descricao: null,
    membrosIds,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildMember(id: string, userId: string | null): Member {
  return {
    id,
    tenantId: 't1',
    userId,
    nomeCompleto: `Irmão ${id}`,
    fotoUrl: null,
    email: `${id}@vl6.org.br`,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: id,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'regular',
    lojaId: 't1',
    potencia: 'GLEG',
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
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

describe('ListCommitteesByGestaoUseCase', () => {
  function buildUseCase() {
    const committeeRepository = new InMemoryCommitteeRepository();
    const useCase = new ListCommitteesByGestaoUseCase({ committeeRepository });
    return { useCase, committeeRepository };
  }

  it('lista as comissões de uma gestão', async () => {
    const { useCase, committeeRepository } = buildUseCase();
    await committeeRepository.create(buildCommittee('c1', 'term-1', []));
    await committeeRepository.create(buildCommittee('c2', 'term-1', []));
    await committeeRepository.create(buildCommittee('c3', 'term-2', []));

    const committees = await useCase.execute(ctx, 'term-1');

    expect(committees).toHaveLength(2);
    expect(committees.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('lança ForbiddenError quando falta a permissão committee:read', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(forbiddenCtx, 'term-1')).rejects.toThrow(ForbiddenError);
  });

  it('retorna lista vazia quando a gestão não tem comissões', async () => {
    const { useCase } = buildUseCase();

    const committees = await useCase.execute(ctx, 'term-sem-comissoes');

    expect(committees).toEqual([]);
  });
});

describe('ListMyCommitteesUseCase', () => {
  function buildUseCase() {
    const committeeRepository = new InMemoryCommitteeRepository();
    const memberRepository = new InMemoryMemberRepository();
    const useCase = new ListMyCommitteesUseCase({ committeeRepository, memberRepository });
    return { useCase, committeeRepository, memberRepository };
  }

  it('lista as comissões das quais o próprio Irmão faz parte', async () => {
    const { useCase, committeeRepository, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember('m1', ctx.uid));
    await committeeRepository.create(buildCommittee('c1', 'term-1', ['m1']));
    await committeeRepository.create(buildCommittee('c2', 'term-1', ['m2']));

    const committees = await useCase.execute(ctx);

    expect(committees).toHaveLength(1);
    expect(committees[0]?.id).toBe('c1');
  });

  it('retorna lista vazia quando o usuário não tem registro de Irmão vinculado', async () => {
    const { useCase, committeeRepository } = buildUseCase();
    await committeeRepository.create(buildCommittee('c1', 'term-1', ['m1']));

    const committees = await useCase.execute(ctx);

    expect(committees).toEqual([]);
  });
});
