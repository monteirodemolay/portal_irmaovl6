import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryTenantRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { Tenant } from '../../tenancy/entities/tenant.entity';
import { CreateExaltationArchiveItemUseCase } from './create-exaltation-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:create'],
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-existente',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2025-06-15T20:00:00Z'),
    dataFim: null,
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: 'term-1',
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    grau: 'mestre',
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

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2025/2026',
  periodoInicio: new Date('2025-01-01'),
  periodoFim: new Date('2025-12-31'),
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const tenantRepository = new InMemoryTenantRepository();
  const useCase = new CreateExaltationArchiveItemUseCase({
    archiveItemRepository,
    eventRepository,
    boardTermRepository,
    tenantRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveItemRepository, eventRepository, boardTermRepository, tenantRepository };
}

const tenantComEndereco: Tenant = {
  id: 't1',
  tenantId: 't1',
  nome: 'Loja Maçônica Verdadeira Luz nº 06',
  numero: '6',
  potencia: 'GLEG',
  dominio: null,
  subdominio: 'vl6',
  endereco: {
    logradouro: 'Rua Exemplo',
    numero: '123',
    bairro: 'Centro',
    cidade: 'Rio Verde',
    estado: 'GO',
    pais: 'Brasil',
    cep: '75901-000',
  },
  telefone: null,
  whatsapp: null,
  site: null,
  email: 'contato@vl6.com.br',
  modulosHabilitados: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

describe('CreateExaltationArchiveItemUseCase', () => {
  it('reaproveita um Evento já existente na mesma data, sem criar um novo', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, {
      memberId: 'member-1',
      nomeCompleto: 'João da Silva',
      dataExaltacao: new Date('2025-06-15T12:00:00Z'),
    });

    expect(result.created).toBe(true);
    expect(result.eventCreated).toBe(false);
    expect(result.archiveItem.eventId).toBe('event-existente');
    expect(result.archiveItem.boardTermId).toBe('term-1');
    expect(result.archiveItem.titulo).toBe('Exaltação de João da Silva');
    expect(result.archiveItem.publicacaoStatus).toBe('rascunho');
    expect(result.archiveItem.origemExaltacaoMemberId).toBe('member-1');
  });

  it('cria um Evento mínimo de grau Mestre quando não há nenhum na data', async () => {
    const { useCase, eventRepository, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, {
      memberId: 'member-2',
      nomeCompleto: 'Maria Souza',
      dataExaltacao: new Date('2025-07-20T12:00:00Z'),
    });

    expect(result.created).toBe(true);
    expect(result.eventCreated).toBe(true);

    const events = await eventRepository.listInRange(
      't1',
      new Date('2025-07-01'),
      new Date('2025-07-31'),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.tipo).toBe('sessao');
    expect(events[0]?.grau).toBe('mestre');
    expect(events[0]?.boardTermId).toBe('term-1');
    expect(events[0]?.local).toBe('A confirmar');
    expect(result.archiveItem.eventId).toBe(events[0]?.id);
  });

  it('usa o endereço cadastrado da Loja como local do Evento criado, quando existe', async () => {
    const { useCase, eventRepository, boardTermRepository, tenantRepository } = buildUseCase();
    await boardTermRepository.create(term);
    await tenantRepository.create(tenantComEndereco);

    await useCase.execute(ctx, {
      memberId: 'member-3',
      nomeCompleto: 'Pedro Alves',
      dataExaltacao: new Date('2025-08-10T12:00:00Z'),
    });

    const events = await eventRepository.listInRange(
      't1',
      new Date('2025-08-01'),
      new Date('2025-08-31'),
    );
    expect(events[0]?.local).toBe('Rua Exemplo, 123 - Centro - Rio Verde/GO');
  });

  it('é idempotente — a segunda chamada para o mesmo Irmão não cria nada novo', async () => {
    const { useCase, eventRepository, archiveItemRepository } = buildUseCase();
    await eventRepository.create(buildEvent());

    const input = {
      memberId: 'member-1',
      nomeCompleto: 'João da Silva',
      dataExaltacao: new Date('2025-06-15T12:00:00Z'),
    };
    const first = await useCase.execute(ctx, input);
    const second = await useCase.execute(ctx, input);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.archiveItem.id).toBe(first.archiveItem.id);

    const items = await archiveItemRepository.findByTenant('t1', { limit: 100 });
    expect(items.items).toHaveLength(1);
  });
});
