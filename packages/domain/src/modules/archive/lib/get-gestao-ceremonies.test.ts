import { describe, expect, it } from 'vitest';
import {
  InMemoryArchiveItemRepository,
  InMemoryEventRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { Event } from '../../agenda/entities/event.entity';
import type { Member } from '../../membership/entities/member.entity';
import { getGestaoCeremonies } from './get-gestao-ceremonies';

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2025-03-10T20:00:00Z'),
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
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
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
    boardTermId: 'gestao-2025',
    titulo: 'Iniciação — 10/03/2025',
    tipo: 'outro',
    descricao: null,
    nivelAcesso: 'irmaos',
    publicacaoStatus: 'rascunho',
    capaMediaId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
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
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildDeps() {
  return {
    eventRepository: new InMemoryEventRepository(),
    archiveItemRepository: new InMemoryArchiveItemRepository(),
    memberRepository: new InMemoryMemberRepository(),
  };
}

describe('getGestaoCeremonies', () => {
  it('lista Iniciação/Elevação/Exaltação vinculadas à Gestão, ordenadas por data', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(
      buildEvent({ id: 'event-2', titulo: 'Sessão de Exaltação', dataInicio: new Date('2025-06-01T20:00:00Z') }),
    );
    await deps.eventRepository.create(
      buildEvent({ id: 'event-1', titulo: 'Sessão de Iniciação', dataInicio: new Date('2025-03-10T20:00:00Z') }),
    );
    await deps.archiveItemRepository.create(
      buildItem({
        id: 'item-1',
        eventId: 'event-1',
        boardTermId: 'gestao-2025',
        origemIniciacaoMemberIds: ['member-1', 'member-2'],
      }),
    );
    await deps.archiveItemRepository.create(
      buildItem({
        id: 'item-2',
        eventId: 'event-2',
        boardTermId: 'gestao-2025',
        origemExaltacaoMemberIds: ['member-3'],
      }),
    );
    await deps.memberRepository.create(buildMember({ id: 'member-1' }));
    await deps.memberRepository.create(buildMember({ id: 'member-2', nomeCompleto: 'Carlos Souza' }));
    await deps.memberRepository.create(buildMember({ id: 'member-3', nomeCompleto: 'Pedro Lima' }));

    const result = await getGestaoCeremonies(deps, 'gestao-2025');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ tipo: 'iniciacao', eventId: 'event-1', eventTitulo: 'Sessão de Iniciação' });
    expect(result[0]?.membros.map((m) => m.memberId).sort()).toEqual(['member-1', 'member-2']);
    expect(result[1]).toMatchObject({ tipo: 'exaltacao', eventId: 'event-2', eventTitulo: 'Sessão de Exaltação' });
  });

  it('ignora ArchiveItem de outra Gestão', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent({ id: 'event-1' }));
    await deps.archiveItemRepository.create(
      buildItem({ eventId: 'event-1', boardTermId: 'outra-gestao', origemIniciacaoMemberIds: ['member-1'] }),
    );

    const result = await getGestaoCeremonies(deps, 'gestao-2025');
    expect(result).toEqual([]);
  });

  it('ignora ArchiveItem sem nenhum origem*MemberIds preenchido', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent({ id: 'event-1' }));
    await deps.archiveItemRepository.create(buildItem({ eventId: 'event-1', boardTermId: 'gestao-2025' }));

    const result = await getGestaoCeremonies(deps, 'gestao-2025');
    expect(result).toEqual([]);
  });

  it('ignora membro cujo cadastro foi excluído', async () => {
    const deps = buildDeps();
    await deps.eventRepository.create(buildEvent({ id: 'event-1' }));
    await deps.archiveItemRepository.create(
      buildItem({
        eventId: 'event-1',
        boardTermId: 'gestao-2025',
        origemIniciacaoMemberIds: ['member-1'],
      }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'member-1', deletedAt: new Date('2025-02-01') }),
    );

    const result = await getGestaoCeremonies(deps, 'gestao-2025');
    expect(result).toEqual([]);
  });
});
