import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryMemberRepository,
  InMemoryMemberSituationRecordRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryBoardTermRepository,
  InMemoryBoardPositionAssignmentRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { HistoricalBoardTermInput } from '../lib/historical-board-terms-vl6';
import { ImportHistoricalBoardTermsUseCase } from './import-historical-board-terms.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:manage', 'member:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-existing',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Dino Moraes de Sousa',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '999',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    dataFalecimento: null,
    mensagemHomenagem: null,
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
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildDeps() {
  const memberRepository = new InMemoryMemberRepository();
  const situationRecordRepository = new InMemoryMemberSituationRecordRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const assignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const useCase = new ImportHistoricalBoardTermsUseCase({
    memberRepository,
    situationRecordRepository,
    positionHistoryRepository,
    boardTermRepository,
    assignmentRepository,
    clock: new FixedClock(new Date('2026-09-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    memberRepository,
    situationRecordRepository,
    positionHistoryRepository,
    boardTermRepository,
    assignmentRepository,
  };
}

const simpleTerm: HistoricalBoardTermInput = {
  nome: 'Gestão 1978/1979',
  periodoInicio: '1978-08-19',
  periodoFim: '1979-05-31',
  segments: [
    {
      cargo: 'veneravel_mestre',
      nomeCompleto: 'Ribas Marques',
      dataInicio: '1978-08-19',
      dataFim: '1979-05-31',
    },
    {
      cargo: 'primeiro_vigilante',
      nomeCompleto: 'Valério Teles Pires',
      dataInicio: '1978-08-19',
      dataFim: '1979-05-31',
    },
  ],
};

const splitTerm: HistoricalBoardTermInput = {
  nome: 'Gestão 1991/1992',
  periodoInicio: '1991-06-01',
  periodoFim: '1992-05-31',
  segments: [
    {
      cargo: 'veneravel_mestre',
      nomeCompleto: 'Anézio Ferreira de Assunção',
      dataInicio: '1991-06-01',
      dataFim: '1991-10-31',
    },
    {
      cargo: 'veneravel_mestre',
      nomeCompleto: 'Ivam Damasceno',
      dataInicio: '1991-11-01',
      dataFim: '1992-05-31',
    },
  ],
};

describe('ImportHistoricalBoardTermsUseCase', () => {
  it('cria gestão, Membros novos e o registro de titular', async () => {
    const deps = buildDeps();

    const result = await deps.useCase.execute(ctx, [simpleTerm], {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(result.value.every((row) => row.memberStatus === 'criado')).toBe(true);
    expect(result.value.every((row) => row.gestaoStatus === 'criada')).toBe(true);

    const terms = await deps.boardTermRepository.listByTenant('t1');
    expect(terms).toHaveLength(1);
    expect(terms[0]?.nome).toBe('Gestão 1978/1979');

    const assignment = await deps.assignmentRepository.findByGestaoAndCargo(
      terms[0]!.id,
      'veneravel_mestre',
    );
    const ribas = await deps.memberRepository.search({ tenantId: 't1' }, { limit: 10 });
    const ribasMember = ribas.items.find((m) => m.nomeCompleto === 'Ribas Marques');
    expect(assignment?.memberId).toBe(ribasMember?.id);
    expect(ribasMember?.situacao).toBe('ativo');
  });

  it('casa por nome com Membro já cadastrado, sem duplicar', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember());

    const term: HistoricalBoardTermInput = {
      nome: 'Gestão 2018/2019',
      periodoInicio: '2018-06-01',
      periodoFim: '2019-05-31',
      segments: [
        {
          cargo: 'segundo_vigilante',
          nomeCompleto: 'Dino Moraes de Sousa',
          dataInicio: '2018-06-01',
          dataFim: '2019-05-31',
        },
      ],
    };
    const result = await deps.useCase.execute(ctx, [term], {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.memberStatus).toBe('já existia');

    const all = await deps.memberRepository.search({ tenantId: 't1' }, { limit: 10 });
    expect(all.items.filter((m) => m.nomeCompleto === 'Dino Moraes de Sousa')).toHaveLength(1);
  });

  it('rodar de novo não duplica gestão nem histórico de posição', async () => {
    const deps = buildDeps();
    await deps.useCase.execute(ctx, [simpleTerm], {});
    await deps.useCase.execute(ctx, [simpleTerm], {});

    const terms = await deps.boardTermRepository.listByTenant('t1');
    expect(terms).toHaveLength(1);

    const all = await deps.memberRepository.search({ tenantId: 't1' }, { limit: 10 });
    expect(all.items.filter((m) => m.nomeCompleto === 'Ribas Marques')).toHaveLength(1);

    const history = await deps.positionHistoryRepository.listByTenant('t1');
    expect(history).toHaveLength(2);
  });

  it('gestão com troca de titular no meio do ano: 2 registros de histórico, 1 titular final', async () => {
    const deps = buildDeps();

    const result = await deps.useCase.execute(ctx, [splitTerm], {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);

    const terms = await deps.boardTermRepository.listByTenant('t1');
    const assignment = await deps.assignmentRepository.findByGestaoAndCargo(
      terms[0]!.id,
      'veneravel_mestre',
    );
    const all = await deps.memberRepository.search({ tenantId: 't1' }, { limit: 10 });
    const ivam = all.items.find((m) => m.nomeCompleto === 'Ivam Damasceno');
    expect(assignment?.memberId).toBe(ivam?.id);

    const historyForIvam = await deps.positionHistoryRepository.listByMemberId(ivam!.id);
    expect(historyForIvam).toHaveLength(1);
    expect(historyForIvam[0]?.dataFim).toEqual(new Date('1992-05-31'));
  });

  it('aplica foto vinda do mapa de fotos quando o Membro é criado', async () => {
    const deps = buildDeps();

    const result = await deps.useCase.execute(ctx, [simpleTerm], {
      'ribas marques': 'https://blob.example/ribas.jpg',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ribasRow = result.value.find((r) => r.nomeCompleto === 'Ribas Marques');
    expect(ribasRow?.fotoAtualizada).toBe(true);

    const all = await deps.memberRepository.search({ tenantId: 't1' }, { limit: 10 });
    const ribasMember = all.items.find((m) => m.nomeCompleto === 'Ribas Marques');
    expect(ribasMember?.fotoUrl).toBe('https://blob.example/ribas.jpg');
  });

  it('recusa sem permissão', async () => {
    const deps = buildDeps();
    await expect(deps.useCase.execute(readOnlyCtx, [simpleTerm], {})).rejects.toThrow();
  });

  it('não cria cadastro pra nome parecido com Irmão já existente — sinaliza pra revisão', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(
      buildMember({ id: 'ivan-1', nomeCompleto: 'Ivan Damasceno' }),
    );

    const term: HistoricalBoardTermInput = {
      nome: 'Gestão 1994/1995',
      periodoInicio: '1994-06-01',
      periodoFim: '1995-05-31',
      segments: [
        // erro de digitação típico da nominata em papel: "Ivam" em vez de "Ivan"
        {
          cargo: 'veneravel_mestre',
          nomeCompleto: 'Ivam Damasceno',
          dataInicio: '1994-06-01',
          dataFim: '1995-05-31',
        },
      ],
    };

    const result = await deps.useCase.execute(ctx, [term], {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      memberStatus: 'revisar',
      sugestaoNomeParecido: 'Ivan Damasceno',
    });

    // não cria um segundo "Ivam Damasceno"
    const all = await deps.memberRepository.search({ tenantId: 't1' }, { limit: 10 });
    expect(all.items).toHaveLength(1);
    expect(all.items[0]?.nomeCompleto).toBe('Ivan Damasceno');

    // não cria histórico nem titular pra esse cargo — fica pendente até o Administrador revisar
    const history = await deps.positionHistoryRepository.listByTenant('t1');
    expect(history).toHaveLength(0);
    const terms = await deps.boardTermRepository.listByTenant('t1');
    const assignment = await deps.assignmentRepository.findByGestaoAndCargo(
      terms[0]!.id,
      'veneravel_mestre',
    );
    expect(assignment).toBeNull();
  });
});
