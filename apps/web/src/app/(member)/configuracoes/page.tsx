import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { DeleteAccountSection } from '@/modules/identity-access/components/delete-account-section';
import { NotificationPreferenceForm } from '@/modules/notification/components/notification-preference-form';
import { GoogleConnectionCard } from '@/modules/integrations/components/google-connection-card';

/**
 * Rota pessoal "Configurações" — distinta de `/admin/configuracoes`
 * (administração do tenant) e de `/irmaos/meu-espaco` (autoatendimento do
 * perfil institucional). Fase 4 da Central de Avisos (docs/architecture).
 */
export default async function ConfiguracoesPage() {
  const session = await requireSession();
  const container = createServerContainer();

  const [preference, connection] = await Promise.all([
    container.repositories.notificationPreference.findByUserId(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    container.repositories.googleCalendarConnection.findByUserId(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <span className="text-accent text-xs font-semibold uppercase tracking-wide">
          Minha conta
        </span>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="text-muted text-sm">
          Gerencie seu acesso, suas preferências de comunicação e seus direitos de privacidade no
          Portal.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
          Conta e acesso
        </h2>
        <div className="border-border rounded-lg border p-4 text-sm">
          <p className="text-muted text-xs">E-mail de acesso</p>
          <p className="font-medium">{session.user.email}</p>
          <p className="text-muted mt-3 text-xs">
            Para alterar a senha, use "Esqueci minha senha" na tela de login — enviamos um link de
            redefinição para o seu e-mail.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Comunicações</h2>
        <NotificationPreferenceForm
          canaisHabilitados={preference?.canaisHabilitados ?? ['interno']}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
          Privacidade e dados
        </h2>
        <p className="text-muted text-sm">
          Suas preferências de visibilidade no diretório da Central VL6 ficam em{' '}
          <Link href="/irmaos/meu-espaco" className="text-accent underline">
            Meu Espaço
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Integrações</h2>
        <GoogleConnectionCard connection={connection} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-red-700">
          Privacidade e exclusão
        </h2>
        <DeleteAccountSection email={session.user.email} />
      </section>
    </div>
  );
}
