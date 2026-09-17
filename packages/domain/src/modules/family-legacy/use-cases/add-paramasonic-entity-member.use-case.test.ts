import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import {
  AddParamasonicEntityMemberUseCase,
  type AddParamasonicEntityMemberInput,
} from './add-paramasonic-entity-member.use-case';

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

async function buildScenario() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const paramasonicEntityMemberRepository = new InMemoryParamasonicEntityMemberRepository();
  const memberRepository = new InMemoryMemberRepository();
  await memberRepository.create(buildMember());

  const createEntityUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const created = await createEntityUseCase.execute(ctx, {
    kind: 'demolay',
    name: 'Capítulo Guardiões da Vigilância',
    shortName: 'DeMolays',
    unitNumber: null,
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });
  if (!created.ok) throw new Error('setup failed');

  const useCase = new AddParamasonicEntityMemberUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, paramasonicEntityMemberRepository, entityId: created.value.id };
}

const baseInput: Omit<AddParamasonicEntityMemberInput, 'entityId'> = {
  memberId: null,
  nomeCompleto: 'Maria Almeida',
  contato: 'maria@example.com',
  cargo: 'Presidência',
  situacao: 'ativo',
  dataIngresso: new Date('2024-01-01'),
};

describe('AddParamasonicEntityMemberUseCase', () => {
  it('adiciona um integrante do corpo próprio', async () => {
    const { useCase, entityId, paramasonicEntityMemberRepository } = await buildScenario();

    const result = await useCase.execute(ctx, { ...baseInput, entityId });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nomeCompleto).toBe('Maria Almeida');
    expect(result.value.memberId).toBeNull();
    const stored = await paramasonicEntityMemberRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('adiciona um Irmão cadastrado que ocupou cargo na entidade', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, {
      entityId,
      memberId: 'member-1',
      nomeCompleto: null,
      contato: null,
      cargo: 'Conselheiro',
      situacao: 'ativo',
      dataIngresso: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('member-1');
    expect(result.value.nomeCompleto).toBeNull();
  });

  it('rejeita quando nem memberId nem nomeCompleto são informados', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, { ...baseInput, entityId, nomeCompleto: null });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita quando memberId e nomeCompleto vêm preenchidos ao mesmo tempo', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, { ...baseInput, entityId, memberId: 'member-1' });

    expect(result.ok).toBe(false);
  });

  it('retorna NotFoundError para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, { ...baseInput, entityId: 'inexistente' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('retorna NotFoundError quando memberId não existe', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, {
      entityId,
      memberId: 'inexistente',
      nomeCompleto: null,
      contato: null,
      cargo: null,
      situacao: 'ativo',
      dataIngresso: null,
    });

    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:manage', async () => {
    const { useCase, entityId } = await buildScenario();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, { ...baseInput, entityId })).rejects.toThrow(
      ForbiddenError,
    );
  });
});
