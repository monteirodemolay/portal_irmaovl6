import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { AddParamasonicEntityMemberUseCase } from './add-paramasonic-entity-member.use-case';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { ListAllParamasonicEntityMembersUseCase } from './list-all-paramasonic-entity-members.use-case';

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

describe('ListAllParamasonicEntityMembersUseCase', () => {
  it('agrega integrantes de todas as entidades, com o nome da entidade anexado', async () => {
    const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
    const paramasonicEntityMemberRepository = new InMemoryParamasonicEntityMemberRepository();
    const memberRepository = new InMemoryMemberRepository();
    await memberRepository.create(buildMember());

    const createEntityUseCase = new CreateParamasonicEntityUseCase({
      paramasonicEntityRepository,
      clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
      idGenerator: new SequentialIdGenerator(),
    });
    const demolay = await createEntityUseCase.execute(ctx, {
      kind: 'demolay',
      name: 'Capítulo Rio Verde n.º 350',
      shortName: 'DeMolays',
      unitNumber: '350',
      parentUnitName: 'Loja Verdadeira Luz nº 06',
      situacao: 'ativa',
      modules: { people: true, agenda: true, content: true, publicPage: false },
    });
    const jobsDaughters = await createEntityUseCase.execute(ctx, {
      kind: 'jobs_daughters',
      name: 'Bethel 1',
      shortName: 'Filhas de Jó',
      unitNumber: '1',
      parentUnitName: 'Loja Verdadeira Luz nº 06',
      situacao: 'ativa',
      modules: { people: true, agenda: true, content: true, publicPage: false },
    });
    if (!demolay.ok || !jobsDaughters.ok) throw new Error('setup failed');

    const addUseCase = new AddParamasonicEntityMemberUseCase({
      paramasonicEntityMemberRepository,
      paramasonicEntityRepository,
      memberRepository,
      clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
      idGenerator: new SequentialIdGenerator(),
    });
    await addUseCase.execute(ctx, {
      entityId: demolay.value.id,
      memberId: 'member-1',
      nomeCompleto: null,
      contato: null,
      cargo: 'Consultor',
      categoria: 'senior_demolay',
      situacao: 'ativo',
      dataIngresso: null,
    });
    await addUseCase.execute(ctx, {
      entityId: jobsDaughters.value.id,
      memberId: null,
      nomeCompleto: 'Maria Souza',
      contato: null,
      cargo: null,
      situacao: 'ativo',
      dataIngresso: null,
    });

    const useCase = new ListAllParamasonicEntityMembersUseCase({
      paramasonicEntityMemberRepository,
      paramasonicEntityRepository,
      memberRepository,
    });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(2);
    const joao = result.find((r) => r.nomeCompleto === 'João da Silva Neto');
    expect(joao?.entityShortName).toBe('DeMolays');
    expect(joao?.categoria).toBe('senior_demolay');
    const maria = result.find((r) => r.nomeCompleto === 'Maria Souza');
    expect(maria?.entityShortName).toBe('Filhas de Jó');
    expect(maria?.memberId).toBeNull();
  });

  it('lança ForbiddenError quando falta permissão', async () => {
    const useCase = new ListAllParamasonicEntityMembersUseCase({
      paramasonicEntityMemberRepository: new InMemoryParamasonicEntityMemberRepository(),
      paramasonicEntityRepository: new InMemoryParamasonicEntityRepository(),
      memberRepository: new InMemoryMemberRepository(),
    });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
