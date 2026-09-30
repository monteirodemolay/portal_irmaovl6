import Link from 'next/link';
import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { PageHero } from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { DeleteAccountSection } from '@/modules/identity-access/components/delete-account-section';
import { NotificationPreferenceForm } from '@/modules/notification/components/notification-preference-form';
import { GoogleConnectionCard } from '@/modules/integrations/components/google-connection-card';

/**
 * Rota pessoal "Configurações" — distinta de `/admin/configuracoes`
 * (administração do tenant) e de `/irmaos/meu-espaco` (autoatendimento do
 * perfil institucional). Fase 4 da Central de Avisos (docs/architecture).
 */
export default async function ConfiguracoesPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  if (!current) return null;

  const container = createServerContainer();
  const heroPhoto = resolveHeroPhoto(current.tenant, 'configuracoes');
  const canManageHeroPhoto = hasPermission(session.authContext, 'tenant:manage');

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
    <div className="flex flex-col gap-6">
      <PageHero
        kicker="Minha conta"
        title="Configurações"
        description="Gerencie seu acesso, suas preferências de comunicação e seus direitos de privacidade no Portal."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          canManageHeroPhoto && (
            <PageHeroPhotoUpload
              pageKey="configuracoes"
              path="/configuracoes"
              hasPhoto={Boolean(heroPhoto)}
              initialPosicao={heroPhoto?.posicao ?? 50}
            />
          )
        }
      />

      <div className="flex max-w-2xl flex-col gap-8">
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
            . A Política de Privacidade e os Termos de Uso vigentes, seu histórico de aceite e o
            histórico de versões ficam em{' '}
            <Link href="/irmaos/configuracoes/termos-e-privacidade" className="text-accent underline">
              Termos e Privacidade
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
    </div>
  );
}
