import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeGoogleCalendarService,
  FakeTokenCipher,
  FixedClock,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryGoogleEventSyncLinkRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { SyncVl6EventToGoogleUseCase } from './sync-vl6-event-to-google.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildConnection(
  overrides: Partial<GoogleCalendarConnection> = {},
): GoogleCalendarConnection {
  return {
    id: 'conn-1',
    tenantId: 't1',
    userId: 'u1',
    syncStatus: 'connected',
    googleAccountEmail: 'irmao@gmail.com',
    accessTokenEncrypted: 'enc(access-token)',
    accessTokenExpiresAt: new Date('2026-06-01T01:00:00Z'),
    refreshTokenEncrypted: 'enc(refresh-token)',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    syncToken: null,
    calendarId: 'primary',
    lastSyncedAt: null,
    lastError: null,
    preferences: {
      exibirEventosGoogle: true,
      sincronizarVL6ParaGoogle: true,
      sincronizarPessoalParaGoogle: true,
      detectarConflitos: true,
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

const event: Event = {
  id: 'event-1',
  tenantId: 't1',
  tipo: 'sessao',
  titulo: 'Sessão Ordinária',
  descricao: null,
  local: 'Sede da Loja',
  dataInicio: new Date('2026-08-18T20:00:00Z'),
  dataFim: new Date('2026-08-18T22:00:00Z'),
  exigeConfirmacaoPresenca: false,
  capacidadeMaxima: null,
  traje: null,
  chegadaSugerida: null,
  observacoes: null,
  arquivosRelacionados: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const syncLinkRepository = new InMemoryGoogleEventSyncLinkRepository();
  const googleCalendarService = new FakeGoogleCalendarService();
  const useCase = new SyncVl6EventToGoogleUseCase({
    connectionRepository,
    syncLinkRepository,
    googleCalendarService,
    tokenCipher: new FakeTokenCipher(),
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, connectionRepository, syncLinkRepository, googleCalendarService };
}

describe('SyncVl6EventToGoogleUseCase', () => {
  it('cria o evento no Google e grava o link na primeira sincronização', async () => {
    const { useCase, connectionRepository, syncLinkRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection());

    const result = await useCase.execute(ctx, event);

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(1);
    const link = await syncLinkRepository.findBySource('t1', 'u1', 'vl6', 'event-1');
    expect(link?.googleEventId).toBe('google-event-1');
  });

  it('atualiza o evento existente em vez de duplicar', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
    await connectionRepository.create(buildConnection());
    await useCase.execute(ctx, event);

    await useCase.execute(ctx, { ...event, titulo: 'Sessão Ordinária — remarcada' });

    expect(googleCalendarService.createdEvents).toHaveLength(1);
    expect(googleCalendarService.updatedEvents).toHaveLength(1);
  });

  it('não sincroniza sem conexão ativa', async () => {
    const { useCase, googleCalendarService } = buildUseCase();

    const result = await useCase.execute(ctx, event);

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });

  it('não sincroniza quando a preferência está desligada', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
    await connectionRepository.create(
      buildConnection({
        preferences: {
          exibirEventosGoogle: true,
          sincronizarVL6ParaGoogle: false,
          sincronizarPessoalParaGoogle: true,
          detectarConflitos: true,
        },
      }),
    );

    await useCase.execute(ctx, event);

    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });
});
