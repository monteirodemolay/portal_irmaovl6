import { describe, expect, it } from 'vitest';
import {
  InMemoryArchiveItemRepository,
  InMemoryEventRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { Event } from '../../agenda/entities/event.entity';
import type { Member } from '../../membership/entities/member.entity';
import { getCeremonyMates, getMemberCeremonyEventIds } from './get-ceremony-mates';

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2020-03-10T20:00:00Z'),
    dataFim: null,
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: null,
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    grau: null,
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

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: null,
    titulo: 'Iniciação — 10/03/2020',
    tipo: 'outro',
    descricao: null,
    nivelAcesso: 'irmaos',
    publicacaoStatus: 'rascunho',
    capaMediaId: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'João da Silva',
    fotoUrl: null,
    email: null,
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
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    dataFalecimento: null,
    mensagemHomenagem: null,
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
  const eventRepository = new InMemoryEventRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const memberRepository = new InMemoryMemberRepository();
  return { eventRepository, archiveItemRepository, memberRepository };
}

describe('getCeremonyMates', () => {
  it('lista os colegas de iniciação da mesma sessão, sem incluir o próprio Irmão', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent());
    await deps.archiveItemRepository.create(
      buildItem({ origemIniciacaoMemberIds: ['member-1', 'member-2', 'member-3'] }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Carlos Souza' }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'member-3', nomeCompleto: 'Pedro Lima' }),
    );

    const member = buildMember({ dataIniciacao: new Date('2020-03-10T20:00:00Z') });
    const result = await getCeremonyMates(deps, member);

    expect(result).toHaveLength(1);
    expect(result[0]?.tipo).toBe('iniciacao');
    expect(result[0]?.colegas.map((c) => c.memberId).sort()).toEqual(['member-2', 'member-3']);
  });

  it('não retorna nada quando o Irmão foi o único iniciado na sessão', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent());
    await deps.archiveItemRepository.create(buildItem({ origemIniciacaoMemberIds: ['member-1'] }));

    const member = buildMember({ dataIniciacao: new Date('2020-03-10T20:00:00Z') });
    const result = await getCeremonyMates(deps, member);

    expect(result).toEqual([]);
  });

  it('não retorna nada quando a data maçônica não está preenchida', async () => {
    const deps = buildDeps();
    const member = buildMember({ dataIniciacao: null });
    const result = await getCeremonyMates(deps, member);
    expect(result).toEqual([]);
  });

  it('agrupa por tipo quando há colegas de iniciação e de exaltação em sessões diferentes', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent({ id: 'event-1', dataInicio: new Date('2020-03-10T20:00:00Z') }));
    await deps.eventRepository.create(
      buildEvent({ id: 'event-2', dataInicio: new Date('2023-07-01T20:00:00Z') }),
    );
    await deps.archiveItemRepository.create(
      buildItem({ id: 'item-1', eventId: 'event-1', origemIniciacaoMemberIds: ['member-1', 'member-2'] }),
    );
    await deps.archiveItemRepository.create(
      buildItem({
        id: 'item-2',
        eventId: 'event-2',
        origemExaltacaoMemberIds: ['member-1', 'member-4'],
      }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Carlos Souza' }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'member-4', nomeCompleto: 'Ana Paula' }),
    );

    const member = buildMember({
      dataIniciacao: new Date('2020-03-10T20:00:00Z'),
      dataExaltacao: new Date('2023-07-01T20:00:00Z'),
    });
    const result = await getCeremonyMates(deps, member);

    expect(result.map((g) => g.tipo).sort()).toEqual(['exaltacao', 'iniciacao']);
    const iniciacao = result.find((g) => g.tipo === 'iniciacao');
    expect(iniciacao?.colegas.map((c) => c.nomeCompleto)).toEqual(['Carlos Souza']);
    const exaltacao = result.find((g) => g.tipo === 'exaltacao');
    expect(exaltacao?.colegas.map((c) => c.nomeCompleto)).toEqual(['Ana Paula']);
  });

  it('ignora colega cujo cadastro foi excluído', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent());
    await deps.archiveItemRepository.create(
      buildItem({ origemIniciacaoMemberIds: ['member-1', 'member-2'] }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Excluído', deletedAt: new Date('2021-01-01') }),
    );

    const member = buildMember({ dataIniciacao: new Date('2020-03-10T20:00:00Z') });
    const result = await getCeremonyMates(deps, member);

    expect(result).toEqual([]);
  });
});

describe('getMemberCeremonyEventIds', () => {
  it('acha o Evento mesmo quando o Irmão foi o único participante da sessão', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent({ id: 'event-1' }));
    await deps.archiveItemRepository.create(
      buildItem({ eventId: 'event-1', origemIniciacaoMemberIds: ['member-1'] }),
    );

    const member = buildMember({ dataIniciacao: new Date('2020-03-10T20:00:00Z') });
    const result = await getMemberCeremonyEventIds(deps, member);

    expect(result).toEqual({ iniciacao: 'event-1' });
  });

  it('devolve mapa vazio quando nenhuma data maçônica está preenchida', async () => {
    const deps = buildDeps();
    const member = buildMember();
    const result = await getMemberCeremonyEventIds(deps, member);
    expect(result).toEqual({});
  });

  it('omite a chave quando a data está preenchida mas não há Evento/ArchiveItem correspondente', async () => {
    const deps = buildDeps();
    const member = buildMember({ dataIniciacao: new Date('2020-03-10T20:00:00Z') });
    const result = await getMemberCeremonyEventIds(deps, member);
    expect(result).toEqual({});
  });

  it('resolve as três cerimônias em sessões diferentes', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent({ id: 'event-1', dataInicio: new Date('2020-03-10T20:00:00Z') }));
    await deps.eventRepository.create(buildEvent({ id: 'event-2', dataInicio: new Date('2021-06-01T20:00:00Z') }));
    await deps.eventRepository.create(buildEvent({ id: 'event-3', dataInicio: new Date('2023-07-01T20:00:00Z') }));
    await deps.archiveItemRepository.create(
      buildItem({ id: 'item-1', eventId: 'event-1', origemIniciacaoMemberIds: ['member-1'] }),
    );
    await deps.archiveItemRepository.create(
      buildItem({ id: 'item-2', eventId: 'event-2', origemElevacaoMemberIds: ['member-1'] }),
    );
    await deps.archiveItemRepository.create(
      buildItem({ id: 'item-3', eventId: 'event-3', origemExaltacaoMemberIds: ['member-1'] }),
    );

    const member = buildMember({
      dataIniciacao: new Date('2020-03-10T20:00:00Z'),
      dataElevacao: new Date('2021-06-01T20:00:00Z'),
      dataExaltacao: new Date('2023-07-01T20:00:00Z'),
    });
    const result = await getMemberCeremonyEventIds(deps, member);

    expect(result).toEqual({ iniciacao: 'event-1', elevacao: 'event-2', exaltacao: 'event-3' });
  });
});
