import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryEventRepository,
  InMemoryArtTemplateRepository,
  InMemoryPublicationRepository,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { ArtTemplate } from '../entities/art-template.entity';
import { CreatePublicationFromEventUseCase } from './create-publication-from-event.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['communication:manage'],
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Aprendiz',
    descricao: null,
    local: 'Templo da Loja Maçônica Verdadeira Luz nº 6',
    dataInicio: new Date('2026-08-24T20:00:00Z'),
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
    grau: 'aprendiz',
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildTemplate(overrides: Partial<ArtTemplate> = {}): ArtTemplate {
  return {
    id: 'template-1',
    tenantId: 't1',
    name: 'Hoje Tem Sessão',
    type: 'session',
    version: 1,
    backgroundUrl: 'https://example.com/template-sessao.png',
    backgroundWidth: 1294,
    backgroundHeight: 2048,
    outputFormats: ['feed'],
    fields: [],
    active: true,
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function setup() {
  const eventRepository = new InMemoryEventRepository();
  const artTemplateRepository = new InMemoryArtTemplateRepository();
  const publicationRepository = new InMemoryPublicationRepository();
  const useCase = new CreatePublicationFromEventUseCase({
    eventRepository,
    artTemplateRepository,
    publicationRepository,
    clock: new FixedClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { eventRepository, artTemplateRepository, publicationRepository, useCase };
}

describe('CreatePublicationFromEventUseCase', () => {
  it('preenche os campos bem-conhecidos a partir do Evento, sem redigitação', async () => {
    const { eventRepository, artTemplateRepository, useCase } = setup();
    await eventRepository.create(buildEvent());
    await artTemplateRepository.create(buildTemplate());

    const result = await useCase.execute(ctx, 'event-1', 'template-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fields.sessionName).toBe('Sessão Aprendiz');
      expect(result.value.fields.degree).toBe('Grau Aprendiz');
      expect(result.value.fields.location).toBe('Templo da Loja Maçônica Verdadeira Luz nº 6');
      expect(result.value.sourceType).toBe('agenda_event');
      expect(result.value.sourceId).toBe('event-1');
    }
  });

  it('nunca altera o Evento de origem', async () => {
    const { eventRepository, artTemplateRepository, useCase } = setup();
    await eventRepository.create(buildEvent());
    await artTemplateRepository.create(buildTemplate());

    await useCase.execute(ctx, 'event-1', 'template-1');

    const event = await eventRepository.findById('event-1');
    expect(event?.titulo).toBe('Sessão Aprendiz');
  });

  it('retoma o rascunho já existente pro mesmo Evento em vez de duplicar', async () => {
    const { eventRepository, artTemplateRepository, useCase } = setup();
    await eventRepository.create(buildEvent());
    await artTemplateRepository.create(buildTemplate());

    const first = await useCase.execute(ctx, 'event-1', 'template-1');
    const second = await useCase.execute(ctx, 'event-1', 'template-1');

    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true);
  });
});
