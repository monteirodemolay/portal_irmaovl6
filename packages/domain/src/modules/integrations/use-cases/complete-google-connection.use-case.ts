import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator, IOAuthStateSigner, ITokenCipher } from '../../../shared/ports';
import { ValidationError, ok, err, type Result } from '../../../shared/result';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleCalendarService } from '../services/google-calendar.service';

export interface CompleteGoogleConnectionDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
  stateSigner: IOAuthStateSigner;
  clock: IClock;
  idGenerator: IIdGenerator;
}

const DEFAULT_PREFERENCES = {
  exibirEventosGoogle: true,
  sincronizarVL6ParaGoogle: true,
  sincronizarPessoalParaGoogle: true,
  detectarConflitos: true,
};

/**
 * Segundo hop do OAuth2 — recebido no callback (`code`+`state`). Junto com
 * `StartGoogleConnectionUseCase`, implementa `connectGoogleCalendar()`: o
 * protocolo por redirect é inerentemente 2 requisições HTTP separadas.
 */
export class CompleteGoogleConnectionUseCase {
  constructor(private readonly deps: CompleteGoogleConnectionDeps) {}

  async execute(
    ctx: AuthContext,
    code: string,
    state: string,
  ): Promise<Result<GoogleCalendarConnection>> {
    const payload = this.deps.stateSigner.verify(state);
    if (!payload || payload.uid !== ctx.uid || payload.tenantId !== ctx.tenantId) {
      return err(new ValidationError('Estado de autenticação inválido ou expirado.'));
    }

    const tokens = await this.deps.googleCalendarService.exchangeCodeForTokens(code);
    const now = this.deps.clock.now();
    const existing = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);

    const accessTokenEncrypted = this.deps.tokenCipher.encrypt(tokens.accessToken);
    const refreshTokenEncrypted = this.deps.tokenCipher.encrypt(tokens.refreshToken);

    if (existing) {
      const updated: GoogleCalendarConnection = {
        ...existing,
        syncStatus: 'connected',
        accessTokenEncrypted,
        accessTokenExpiresAt: tokens.expiresAt,
        refreshTokenEncrypted,
        scope: tokens.scope,
        lastError: null,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.connectionRepository.update(updated);
      return ok(updated);
    }

    const created: GoogleCalendarConnection = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      syncStatus: 'connected',
      googleAccountEmail: null,
      accessTokenEncrypted,
      accessTokenExpiresAt: tokens.expiresAt,
      refreshTokenEncrypted,
      scope: tokens.scope,
      syncToken: null,
      calendarId: 'primary',
      lastSyncedAt: null,
      lastError: null,
      preferences: DEFAULT_PREFERENCES,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.connectionRepository.create(created);
    return ok(created);
  }
}
