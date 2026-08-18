import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator, ITokenCipher } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleCalendarEventCacheRepository } from '../repositories/google-calendar-event-cache.repository';
import type { IGoogleCalendarService } from '../services/google-calendar.service';

export interface LoadGoogleEventsDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  eventCacheRepository: IGoogleCalendarEventCacheRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * `loadGoogleEvents()` — disparado só pelo botão "Sincronizar agora" (sem
 * cron/webhook). Por isso sempre pede uma listagem completa ao Google (nunca
 * passa `syncToken`, mesmo que a conexão tenha um salvo): sem sincronização
 * em segundo plano pra justificar o delta incremental, o custo extra é
 * irrelevante e o ganho é reconciliar o cache local a cada clique — inclui
 * remover eventos apagados no Google que a API não teria como sinalizar de
 * outra forma (ex.: aniversário de contato excluído). Atualiza o cache local
 * (`googleCalendarEvents`) que "Minha Agenda" lê; nunca chama a Calendar API
 * a cada render da página.
 */
export class LoadGoogleEventsUseCase {
  constructor(private readonly deps: LoadGoogleEventsDeps) {}

  async execute(ctx: AuthContext): Promise<Result<void>> {
    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection) return err(new NotFoundError('GoogleCalendarConnection', ctx.uid));

    const startedAt = this.deps.clock.now();
    await this.deps.connectionRepository.update({
      ...connection,
      syncStatus: 'syncing',
      updatedAt: startedAt,
      updatedBy: ctx.uid,
    });

    try {
      const accessToken = await this.resolveAccessToken(connection, ctx);
      const result = await this.deps.googleCalendarService.loadEvents(
        accessToken,
        connection.calendarId,
        null,
      );

      const confirmedIds = new Set<string>();
      for (const change of result.changes) {
        if (change.status === 'cancelled') {
          await this.deps.eventCacheRepository.deleteByGoogleEventId(
            ctx.tenantId,
            ctx.uid,
            change.googleEventId,
          );
          continue;
        }
        confirmedIds.add(change.googleEventId);
        const now = this.deps.clock.now();
        await this.deps.eventCacheRepository.upsert({
          id: `${ctx.uid}_${change.googleEventId}`,
          tenantId: ctx.tenantId,
          userId: ctx.uid,
          googleEventId: change.googleEventId,
          titulo: change.titulo,
          local: change.local,
          inicio: change.inicio,
          fim: change.fim,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        });
      }

      // Uma listagem completa (sem `syncToken`) nunca devolve `cancelled`
      // para itens removidos no Google — só reflete o estado atual. Sem
      // isso, um evento apagado no Google (ex.: aniversário de contato
      // removido) ficaria preso no cache pra sempre depois de uma
      // sincronização completa (primeira conexão ou recuperação de um
      // `syncToken` expirado, HTTP 410).
      if (result.isFullSync && result.fullSyncFrom) {
        const cached = await this.deps.eventCacheRepository.listByUser(ctx.tenantId, ctx.uid);
        for (const cachedEvent of cached) {
          const coveredByFullSync = cachedEvent.inicio >= result.fullSyncFrom;
          if (coveredByFullSync && !confirmedIds.has(cachedEvent.googleEventId)) {
            await this.deps.eventCacheRepository.deleteByGoogleEventId(
              ctx.tenantId,
              ctx.uid,
              cachedEvent.googleEventId,
            );
          }
        }
      }

      const finishedAt = this.deps.clock.now();
      await this.deps.connectionRepository.update({
        ...connection,
        syncStatus: 'connected',
        syncToken: result.nextSyncToken,
        lastSyncedAt: finishedAt,
        lastError: null,
        updatedAt: finishedAt,
        updatedBy: ctx.uid,
      });
      return ok(undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido na sincronização.';
      const failedAt = this.deps.clock.now();
      await this.deps.connectionRepository.update({
        ...connection,
        syncStatus: 'error',
        lastError: message,
        updatedAt: failedAt,
        updatedBy: ctx.uid,
      });
      return err(new ConflictError(message));
    }
  }

  private async resolveAccessToken(
    connection: GoogleCalendarConnection,
    ctx: AuthContext,
  ): Promise<string> {
    const now = this.deps.clock.now();
    if (connection.accessTokenExpiresAt > now) {
      return this.deps.tokenCipher.decrypt(connection.accessTokenEncrypted);
    }

    const refreshToken = this.deps.tokenCipher.decrypt(connection.refreshTokenEncrypted);
    const tokens = await this.deps.googleCalendarService.refreshAccessToken(refreshToken);
    await this.deps.connectionRepository.update({
      ...connection,
      accessTokenEncrypted: this.deps.tokenCipher.encrypt(tokens.accessToken),
      accessTokenExpiresAt: tokens.expiresAt,
      updatedAt: now,
      updatedBy: ctx.uid,
    });
    return tokens.accessToken;
  }
}
