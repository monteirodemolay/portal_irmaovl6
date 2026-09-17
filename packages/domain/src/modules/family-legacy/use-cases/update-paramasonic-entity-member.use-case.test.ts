import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryMemberTitleRepository,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  InMemoryPersonFraternalRecordRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { AddParamasonicEntityMemberUseCase } from './add-paramasonic-entity-member.use-case';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { UpdateParamasonicEntityMemberUseCase } from './update-paramasonic-entity-member.use-case';

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
  const memberTitleRepository = new InMemoryMemberTitleRepository();
  const memberRepository = new InMemoryMemberRepository();
  await memberRepository.create(buildMember());

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
  const linked = await addUseCase.execute(ctx, {
    entityId,
    memberId: 'member-1',
    nomeCompleto: null,
    contato: null,
    cargo: 'Membro do Conselho Consultivo',
    situacao: 'ativo',
    dataIngresso: null,
  });
  if (!linked.ok) throw new Error('setup failed');

  const corpoProprio = await addUseCase.execute(ctx, {
    entityId,
    memberId: null,
    nomeCompleto: 'Zeca Souza',
    contato: null,
    cargo: null,
    situacao: 'ativo',
    dataIngresso: null,
  });
  if (!corpoProprio.ok) throw new Error('setup failed');

  const useCase = new UpdateParamasonicEntityMemberUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    personFraternalRecordRepository,
    memberTitleRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });

  return {
    useCase,
    entityId,
    linkedEntryId: linked.value.id,
    corpoProprioEntryId: corpoProprio.value.id,
    paramasonicEntityMemberRepository,
    personFraternalRecordRepository,
    memberTitleRepository,
  };
}

describe('UpdateParamasonicEntityMemberUseCase', () => {
  it('atualiza cargo, categoria, situação e data de ingresso', async () => {
    const { useCase, corpoProprioEntryId, paramasonicEntityMemberRepository } =
      await buildScenario();

    const result = await useCase.execute(ctx, {
      id: corpoProprioEntryId,
      nomeCompleto: 'Zeca Souza Filho',
      contato: 'zeca@example.com',
      cargo: 'Mestre Conselheiro',
      categoria: 'demolay_ativo',
      situacao: 'inativo',
      dataIngresso: new Date('2020-01-01'),
    });

    expect(result.ok).toBe(true);
    const stored = await paramasonicEntityMemberRepository.findById(corpoProprioEntryId);
    expect(stored?.nomeCompleto).toBe('Zeca Souza Filho');
    expect(stored?.contato).toBe('zeca@example.com');
    expect(stored?.cargo).toBe('Mestre Conselheiro');
    expect(stored?.categoria).toBe('demolay_ativo');
    expect(stored?.situacao).toBe('inativo');
  });

  it('marca "também foi DeMolay" — cria a Afiliação em Família e Legado', async () => {
    const { useCase, linkedEntryId, personFraternalRecordRepository } = await buildScenario();

    const result = await useCase.execute(ctx, {
      id: linkedEntryId,
      nomeCompleto: null,
      contato: null,
      cargo: 'Membro do Conselho Consultivo',
      categoria: 'macom_conselho',
      situacao: 'ativo',
      dataIngresso: null,
      marcarComoExDemolay: true,
    });

    expect(result.ok).toBe(true);
    const records = await personFraternalRecordRepository.listByPerson('t1', 'member', 'member-1');
    expect(records).toHaveLength(1);
    expect(records[0]?.affiliationKind).toBe('demolay');
  });

  it('marca "foi Presidente do Conselho Consultivo" — concede o título Past-Presidente, idempotente', async () => {
    const { useCase, linkedEntryId, memberTitleRepository } = await buildScenario();

    await useCase.execute(ctx, {
      id: linkedEntryId,
      nomeCompleto: null,
      contato: null,
      cargo: 'Presidente do Conselho Consultivo',
      categoria: 'macom_conselho',
      situacao: 'ativo',
      dataIngresso: null,
      marcarComoPastPresidenteConselho: true,
    });
    await useCase.execute(ctx, {
      id: linkedEntryId,
      nomeCompleto: null,
      contato: null,
      cargo: 'Presidente do Conselho Consultivo',
      categoria: 'macom_conselho',
      situacao: 'ativo',
      dataIngresso: null,
      marcarComoPastPresidenteConselho: true,
    });

    const titles = await memberTitleRepository.listByMemberId('t1', 'member-1');
    const pastPresidente = titles.filter((t) => t.titulo === 'past_presidente_conselho_consultivo');
    expect(pastPresidente).toHaveLength(1);
  });

  it('rejeita marcar ex-DeMolay/Past-Presidente pra integrante do corpo próprio', async () => {
    const { useCase, corpoProprioEntryId } = await buildScenario();

    const result = await useCase.execute(ctx, {
      id: corpoProprioEntryId,
      nomeCompleto: 'Zeca Souza',
      contato: null,
      cargo: null,
      categoria: null,
      situacao: 'ativo',
      dataIngresso: null,
      marcarComoExDemolay: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('retorna NotFoundError para integrante inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, {
      id: 'inexistente',
      nomeCompleto: 'X',
      contato: null,
      cargo: null,
      categoria: null,
      situacao: 'ativo',
      dataIngresso: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta paramasonicEntity:manage', async () => {
    const { useCase, corpoProprioEntryId } = await buildScenario();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(semPermissao, {
        id: corpoProprioEntryId,
        nomeCompleto: 'Zeca Souza',
        contato: null,
        cargo: null,
        categoria: null,
        situacao: 'ativo',
        dataIngresso: null,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('lança ForbiddenError ao marcar ex-DeMolay sem familyLegacy:manage', async () => {
    const { useCase, linkedEntryId } = await buildScenario();
    const semFamilyLegacy: AuthContext = { ...ctx, permissions: ['paramasonicEntity:manage'] };

    await expect(
      useCase.execute(semFamilyLegacy, {
        id: linkedEntryId,
        nomeCompleto: null,
        contato: null,
        cargo: null,
        categoria: 'macom_conselho',
        situacao: 'ativo',
        dataIngresso: null,
        marcarComoExDemolay: true,
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
