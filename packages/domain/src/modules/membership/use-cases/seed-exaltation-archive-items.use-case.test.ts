import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryMemberRepository,
  InMemoryTenantRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateExaltationArchiveItemUseCase } from '../../archive/use-cases/create-exaltation-archive-item.use-case';
import type { Member } from '../entities/member.entity';
import { SeedExaltationArchiveItemsUseCase } from './seed-exaltation-archive-items.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@vl6.org.br',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '123',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
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
    autorizaDivulgacaoExterna: false,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase(members: Member[]) {
  const memberRepository = new InMemoryMemberRepository();
  for (const member of members) memberRepository.create(member);
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new SeedExaltationArchiveItemsUseCase({
    memberRepository,
    createExaltationArchiveItem: new CreateExaltationArchiveItemUseCase({
      archiveItemRepository,
      eventRepository,
      boardTermRepository,
      tenantRepository: new InMemoryTenantRepository(),
      clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
      idGenerator: new SequentialIdGenerator(),
    }),
  });
  return { useCase, memberRepository, archiveItemRepository, eventRepository };
}

describe('SeedExaltationArchiveItemsUseCase', () => {
  it('cria item de exaltação só pros Irmãos com dataExaltacao que ainda não têm um', async () => {
    const semItem1 = buildMember({
      id: 'm2',
      nomeCompleto: 'Maria Pendente',
      dataExaltacao: new Date('2015-05-20T00:00:00Z'),
    });
    const semItem2 = buildMember({
      id: 'm3',
      nomeCompleto: 'Pedro Pendente',
      dataExaltacao: new Date('2018-11-02T00:00:00Z'),
    });
    const semDataExaltacao = buildMember({
      id: 'm4',
      nomeCompleto: 'Sem Data',
      dataExaltacao: null,
    });

    const { useCase, archiveItemRepository } = buildUseCase([semItem1, semItem2, semDataExaltacao]);

    const report = await useCase.execute(ctx);

    expect(report.processados).toHaveLength(2);
    expect(report.processados.map((r) => r.memberId).sort()).toEqual(['m2', 'm3']);
    expect(report.pulados).toBe(1);
    expect(report.erros).toHaveLength(0);

    const items = await archiveItemRepository.findByTenant('t1', { limit: 100 });
    expect(items.items).toHaveLength(2);
  });

  it('rodar duas vezes não duplica nada (idempotência do backfill)', async () => {
    const member = buildMember({
      id: 'm1',
      nomeCompleto: 'Maria Pendente',
      dataExaltacao: new Date('2015-05-20T00:00:00Z'),
    });
    const { useCase, archiveItemRepository } = buildUseCase([member]);

    const first = await useCase.execute(ctx);
    const second = await useCase.execute(ctx);

    expect(first.processados).toHaveLength(1);
    expect(second.processados).toHaveLength(0);
    expect(second.pulados).toBe(1);

    const items = await archiveItemRepository.findByTenant('t1', { limit: 100 });
    expect(items.items).toHaveLength(1);
  });

  it('lança ForbiddenError sem a permissão member:manage', async () => {
    const { useCase } = buildUseCase([]);

    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow(ForbiddenError);
  });
});
