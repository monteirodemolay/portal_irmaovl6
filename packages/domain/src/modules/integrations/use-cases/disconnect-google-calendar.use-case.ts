import type { AuthContext } from '../../../shared/auth-context';
import type { ITokenCipher } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IGoogleCalendarConnectionRepository } from '../repositories/google-calendar-connection.repository';
import type { IGoogleCalendarService } from '../services/google-calendar.service';

export interface DisconnectGoogleCalendarDeps {
  connectionRepository: IGoogleCalendarConnectionRepository;
  googleCalendarService: IGoogleCalendarService;
  tokenCipher: ITokenCipher;
}

/** `disconnectGoogleCalendar()` — idempotente, sempre `ok` mesmo sem conexão prévia. */
export class DisconnectGoogleCalendarUseCase {
  constructor(private readonly deps: DisconnectGoogleCalendarDeps) {}

  async execute(ctx: AuthContext): Promise<Result<void>> {
    const connection = await this.deps.connectionRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!connection) return ok(undefined);

    try {
      const accessToken = this.deps.tokenCipher.decrypt(connection.accessTokenEncrypted);
      await this.deps.googleCalendarService.revokeToken(accessToken);
    } catch {
      // Revogação no Google é best-effort — mesmo se falhar, removemos a
      // conexão local (o usuário não deve ficar "preso" a uma integração
      // que não consegue desconectar).
    }

    await this.deps.connectionRepository.delete(connection.id);
    return ok(undefined);
  }
}
