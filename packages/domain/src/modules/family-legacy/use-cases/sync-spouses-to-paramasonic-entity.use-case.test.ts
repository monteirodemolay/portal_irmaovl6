import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { SyncSpousesToParamasonicEntityUseCase } from './sync-spouses-to-paramasonic-entity.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'user-1',
    nomeCompleto: 'Irmão Titular',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
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
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    dataFalecimento: null,
    mensagemHomenagem: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

async function buildScenario(
  members: Member[],
  entityKind: 'female_fraternity' | 'demolay' = 'female_fraternity',
) {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const paramasonicEntityMemberRepository = new InMemoryParamasonicEntityMemberRepository();
  const memberRepository = new InMemoryMemberRepository();
  for (const member of members) await memberRepository.create(member);

  const createEntityUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const created = await createEntityUseCase.execute(ctx, {
    kind: entityKind,
    name: 'Fraternidade Feminina Verdadeira Luz nº 6',
    shortName: 'Fraternidade',
    unitNumber: null,
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: false, content: false, publicPage: false },
  });
  if (!created.ok) throw new Error('setup failed');

  const useCase = new SyncSpousesToParamasonicEntityUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-09-18T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });

  return { useCase, entityId: created.value.id, paramasonicEntityMemberRepository };
}

describe('SyncSpousesToParamasonicEntityUseCase', () => {
  it('adiciona os cônjuges cadastrados como integrantes do corpo próprio', async () => {
    const { useCase, entityId, paramasonicEntityMemberRepository } = await buildScenario([
      buildMember({ id: 'member-1', nomeCompleto: 'João Silva', conjugeNome: 'Maria Silva' }),
      buildMember({ id: 'member-2', nomeCompleto: 'Pedro Souza', conjugeNome: 'Ana Souza' }),
    ]);

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalConjugesCadastrados).toBe(2);
    expect(result.value.adicionados).toEqual([
      { nomeCompleto: 'Ana Souza', doIrmao: 'Pedro Souza' },
      { nomeCompleto: 'Maria Silva', doIrmao: 'João Silva' },
    ]);
    expect(result.value.jaExistentes).toBe(0);

    const entityMembers = await paramasonicEntityMemberRepository.listByEntity('t1', entityId);
    expect(entityMembers.map((m) => m.nomeCompleto).sort()).toEqual(['Ana Souza', 'Maria Silva']);
    expect(entityMembers.every((m) => m.memberId === null)).toBe(true);
    expect(entityMembers.find((m) => m.nomeCompleto === 'Maria Silva')?.conjugeDeMemberId).toBe(
      'member-1',
    );
    expect(entityMembers.find((m) => m.nomeCompleto === 'Ana Souza')?.conjugeDeMemberId).toBe(
      'member-2',
    );
  });

  it('não recria quem já está vinculada ao mesmo Irmão mesmo se o nome foi corrigido depois', async () => {
    const { useCase, entityId, paramasonicEntityMemberRepository } = await buildScenario([
      buildMember({ id: 'member-1', nomeCompleto: 'João Silva', conjugeNome: 'Maria Silva' }),
    ]);
    await paramasonicEntityMemberRepository.create({
      id: 'existente-1',
      tenantId: 't1',
      entityId,
      memberId: null,
      nomeCompleto: 'Maria da Silva',
      contato: null,
      cargo: null,
      categoria: null,
      situacao: 'ativo',
      dataIngresso: null,
      conjugeDeMemberId: 'member-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.adicionados).toHaveLength(0);
    expect(result.value.jaExistentes).toBe(1);
    const entityMembers = await paramasonicEntityMemberRepository.listByEntity('t1', entityId);
    expect(entityMembers).toHaveLength(1);
  });

  it('é idempotente: rodar de novo não duplica quem já foi adicionado', async () => {
    const { useCase, entityId } = await buildScenario([
      buildMember({ id: 'member-1', nomeCompleto: 'João Silva', conjugeNome: 'Maria Silva' }),
    ]);

    await useCase.execute(ctx, entityId);
    const second = await useCase.execute(ctx, entityId);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.adicionados).toHaveLength(0);
    expect(second.value.jaExistentes).toBe(1);
  });

  it('reporta Irmãos com estado civil que implica cônjuge mas sem cônjuge cadastrado', async () => {
    const { useCase, entityId } = await buildScenario([
      buildMember({
        id: 'member-1',
        nomeCompleto: 'João Silva',
        estadoCivil: 'casado',
        conjugeNome: null,
      }),
    ]);

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.irmaosSemConjugeCadastrado).toEqual([
      { memberId: 'member-1', nomeCompleto: 'João Silva' },
    ]);
  });

  it('não reporta quem não tem cônjuge cadastrado e o estado civil não implica um', async () => {
    const { useCase, entityId } = await buildScenario([
      buildMember({
        id: 'member-1',
        nomeCompleto: 'João Silva',
        estadoCivil: 'solteiro',
        conjugeNome: null,
      }),
    ]);

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.irmaosSemConjugeCadastrado).toHaveLength(0);
  });

  it('rejeita entidades que não são Fraternidade Feminina', async () => {
    const { useCase, entityId } = await buildScenario(
      [buildMember({ conjugeNome: 'Maria Silva' })],
      'demolay',
    );

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('lança ForbiddenError sem a permissão paramasonicEntity:manage', async () => {
    const { useCase, entityId } = await buildScenario([
      buildMember({ conjugeNome: 'Maria Silva' }),
    ]);
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, entityId)).rejects.toThrow(ForbiddenError);
  });
});
