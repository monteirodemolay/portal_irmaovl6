import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IOAuthStateSigner } from '../../../shared/ports';
import type { IGoogleCalendarService } from '../services/google-calendar.service';

export interface StartGoogleConnectionDeps {
  googleCalendarService: IGoogleCalendarService;
  stateSigner: IOAuthStateSigner;
  clock: IClock;
}

/**
 * Primeiro hop do OAuth2 (`connectGoogleCalendar()`): gera a URL de
 * autorização do Google com um `state` assinado (uid+tenantId+timestamp),
 * sem gravar nada no banco ainda — o handshake só é concluído em
 * `CompleteGoogleConnectionUseCase`, no callback.
 */
export class StartGoogleConnectionUseCase {
  constructor(private readonly deps: StartGoogleConnectionDeps) {}

  execute(ctx: AuthContext): string {
    const state = this.deps.stateSigner.sign({
      uid: ctx.uid,
      tenantId: ctx.tenantId,
      issuedAt: this.deps.clock.now().getTime(),
    });
    return this.deps.googleCalendarService.buildAuthorizationUrl(state);
  }
}
