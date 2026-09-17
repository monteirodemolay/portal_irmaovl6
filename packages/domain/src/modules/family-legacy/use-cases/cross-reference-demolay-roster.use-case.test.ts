import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  InMemoryPersonFraternalRecordRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { AddParamasonicEntityMemberUseCase } from './add-paramasonic-entity-member.use-case';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { CrossReferenceDemolayRosterUseCase } from './cross-reference-demolay-roster.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage', 'familyLegacy:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'user-1',
    nomeCompleto: 'João da Silva Neto',
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
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  const memberRepository = new InMemoryMemberRepository();
  await memberRepository.create(buildMember());
  await memberRepository.create(
    buildMember({ id: 'member-2', nomeCompleto: 'Pedro Augusto Ferreira Lima' }),
  );

  const createEntityUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const created = await createEntityUseCase.execute(ctx, {
    kind: 'demolay',
    name: 'Capítulo Rio Verde n.º 350',
    shortName: 'DeMolays',
    unitNumber: '350',
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });
  if (!created.ok) throw new Error('setup failed');
  const entityId = created.value.id;

  const addUseCase = new AddParamasonicEntityMemberUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  // Mesmo nome de um Irmão já cadastrado — deve ser vinculado.
  await addUseCase.execute(ctx, {
    entityId,
    memberId: null,
    nomeCompleto: 'João da Silva Neto',
    contato: null,
    cargo: 'Sênior',
    situacao: 'ativo',
    dataIngresso: null,
  });
  // Nome parecido mas não idêntico a "Pedro Augusto Ferreira Lima" — deve virar 'revisar'.
  await addUseCase.execute(ctx, {
    entityId,
    memberId: null,
    nomeCompleto: 'Pedro Augusto Ferreira Lino',
    contato: null,
    cargo: 'Irregular',
    situacao: 'ativo',
    dataIngresso: null,
  });
  // Sem qualquer correspondência.
  await addUseCase.execute(ctx, {
    entityId,
    memberId: null,
    nomeCompleto: 'Zeca Souza Completamente Diferente',
    contato: null,
    cargo: 'Regular',
    situacao: 'ativo',
    dataIngresso: null,
  });

  const useCase = new CrossReferenceDemolayRosterUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    personFraternalRecordRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    entityId,
    paramasonicEntityMemberRepository,
    personFraternalRecordRepository,
  };
}

describe('CrossReferenceDemolayRosterUseCase', () => {
  it('vincula quem tem o mesmo nome de um Irmão já cadastrado', async () => {
    const {
      useCase,
      entityId,
      paramasonicEntityMemberRepository,
      personFraternalRecordRepository,
    } = await buildScenario();

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const vinculado = result.value.find((r) => r.nomeCompleto === 'João da Silva Neto');
    expect(vinculado?.status).toBe('vinculado');

    const stored = await paramasonicEntityMemberRepository.listByEntity('t1', entityId);
    const entry = stored.find((m) => m.memberId === 'member-1');
    expect(entry).toBeDefined();
    expect(entry?.nomeCompleto).toBeNull();
    expect(entry?.cargo).toBe('Sênior');

    const records = await personFraternalRecordRepository.listByPerson('t1', 'member', 'member-1');
    expect(records).toHaveLength(1);
    expect(records[0]?.affiliationKind).toBe('demolay');
    expect(records[0]?.organizacaoNome).toBe('Capítulo Rio Verde n.º 350');
    expect(records[0]?.cargos).toEqual(['Sênior']);
  });

  it('marca "revisar" pra nome parecido mas não idêntico — nunca vincula sozinho', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const revisar = result.value.find((r) => r.nomeCompleto === 'Pedro Augusto Ferreira Lino');
    expect(revisar?.status).toBe('revisar');
    expect(revisar?.sugestaoNomeParecido).toBe('Pedro Augusto Ferreira Lima');
  });

  it('marca "sem correspondência" quando não há Irmão parecido', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const semMatch = result.value.find(
      (r) => r.nomeCompleto === 'Zeca Souza Completamente Diferente',
    );
    expect(semMatch?.status).toBe('sem correspondência');
  });

  it('é idempotente — rodar de novo não duplica o vínculo nem o registro de Família e Legado', async () => {
    const { useCase, entityId, personFraternalRecordRepository } = await buildScenario();
    await useCase.execute(ctx, entityId);

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const jaVinculado = result.value.find((r) => r.nomeCompleto === 'João da Silva Neto');
    expect(jaVinculado?.status).toBe('já estava vinculado');

    const records = await personFraternalRecordRepository.listByPerson('t1', 'member', 'member-1');
    expect(records).toHaveLength(1);
  });

  it('retorna NotFoundError para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta permissão', async () => {
    const { useCase, entityId } = await buildScenario();
    const semPermissao: AuthContext = { ...ctx, permissions: ['paramasonicEntity:manage'] };

    await expect(useCase.execute(semPermissao, entityId)).rejects.toThrow(ForbiddenError);
  });
});
