import { describe, expect, it } from 'vitest';
import {
  InMemoryBoardTermRepository,
  InMemoryCommitteeRepository,
  InMemoryMemberPositionHistoryRepository,
} from '../../../test/fakes';
import { getMemberJourneyCargos, getMemberJourneyCommittees } from './get-member-journey';

function buildDeps() {
  const memberPositionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const committeeRepository = new InMemoryCommitteeRepository();
  return {
    deps: { memberPositionHistoryRepository, boardTermRepository, committeeRepository },
    memberPositionHistoryRepository,
    boardTermRepository,
    committeeRepository,
  };
}

const baseAudit = {
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  deletedAt: null,
  status: 'active' as const,
  ativo: true,
};

describe('getMemberJourneyCargos + getMemberJourneyCommittees', () => {
  it('mescla cargo de Diretoria (gestão mais nova) e comissão (gestão mais antiga), cada função ordenando mais recente primeiro', async () => {
    const { deps, boardTermRepository, memberPositionHistoryRepository, committeeRepository } =
      buildDeps();

    await boardTermRepository.create({
      id: 'gestao-antiga',
      tenantId: 't1',
      nome: 'Gestão 2022/2023',
      periodoInicio: new Date('2022-06-01'),
      periodoFim: new Date('2023-06-01'),
      ...baseAudit,
    });
    await boardTermRepository.create({
      id: 'gestao-nova',
      tenantId: 't1',
      nome: 'Gestão 2024/2025',
      periodoInicio: new Date('2024-06-01'),
      periodoFim: new Date('2025-06-01'),
      ...baseAudit,
    });

    await memberPositionHistoryRepository.create({
      id: 'history-1',
      tenantId: 't1',
      memberId: 'member-1',
      cargo: 'secretario',
      gestaoId: 'gestao-nova',
      dataInicio: new Date('2024-06-01'),
      dataFim: null,
      observacoes: null,
      ...baseAudit,
    });

    await committeeRepository.create({
      id: 'comissao-1',
      tenantId: 't1',
      gestaoId: 'gestao-antiga',
      nome: 'Comissão de Beneficência',
      descricao: null,
      membrosIds: ['member-1'],
      ...baseAudit,
    });

    const cargos = await getMemberJourneyCargos(deps, 'member-1');
    const comissoes = await getMemberJourneyCommittees(deps, 't1', 'member-1');

    expect(cargos).toHaveLength(1);
    expect(cargos[0]).toMatchObject({ cargo: 'secretario', gestaoNome: 'Gestão 2024/2025' });

    expect(comissoes).toHaveLength(1);
    expect(comissoes[0]).toMatchObject({
      nome: 'Comissão de Beneficência',
      gestaoNome: 'Gestão 2022/2023',
      dataInicio: new Date('2022-06-01'),
      dataFim: new Date('2023-06-01'),
    });
  });

  it('ordena múltiplas comissões da mais recente pra mais antiga', async () => {
    const { deps, boardTermRepository, committeeRepository } = buildDeps();

    await boardTermRepository.create({
      id: 'gestao-1',
      tenantId: 't1',
      nome: 'Gestão 2021/2022',
      periodoInicio: new Date('2021-06-01'),
      periodoFim: new Date('2022-06-01'),
      ...baseAudit,
    });
    await boardTermRepository.create({
      id: 'gestao-2',
      tenantId: 't1',
      nome: 'Gestão 2023/2024',
      periodoInicio: new Date('2023-06-01'),
      periodoFim: new Date('2024-06-01'),
      ...baseAudit,
    });

    await committeeRepository.create({
      id: 'comissao-antiga',
      tenantId: 't1',
      gestaoId: 'gestao-1',
      nome: 'Comissão Antiga',
      descricao: null,
      membrosIds: ['member-1'],
      ...baseAudit,
    });
    await committeeRepository.create({
      id: 'comissao-nova',
      tenantId: 't1',
      gestaoId: 'gestao-2',
      nome: 'Comissão Nova',
      descricao: null,
      membrosIds: ['member-1'],
      ...baseAudit,
    });

    const comissoes = await getMemberJourneyCommittees(deps, 't1', 'member-1');

    expect(comissoes.map((c) => c.nome)).toEqual(['Comissão Nova', 'Comissão Antiga']);
  });

  it('devolve listas vazias pra Irmão sem cargo e sem comissão (regressão do empty-state)', async () => {
    const { deps } = buildDeps();

    const cargos = await getMemberJourneyCargos(deps, 'member-sem-nada');
    const comissoes = await getMemberJourneyCommittees(deps, 't1', 'member-sem-nada');

    expect(cargos).toEqual([]);
    expect(comissoes).toEqual([]);
  });
});
