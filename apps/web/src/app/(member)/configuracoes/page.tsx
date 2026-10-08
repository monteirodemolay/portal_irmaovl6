import Link from 'next/link';
import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
    PageHero,
  Palette,
    Scale,
  Share2,
  ShieldCheck,
    UserCircle,
} from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { requireSession } from '@/lib/auth/require-session';
import { getLegalAcceptanceStatus } from '@/lib/legal/get-legal-acceptance-status';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { ConfiguracoesDirectorySettings } from '@/modules/central/components/meu-espaco/configuracoes-directory-settings';
import { ChangePasswordForm } from '@/modules/identity-access/components/change-password-form';
import { DeleteAccountSection } from '@/modules/identity-access/components/delete-account-section';
import { MfaEnrollmentPanel } from '@/modules/identity-access/components/mfa-enrollment-panel';
import { PersonalizationPreferences } from '@/modules/identity-access/components/personalization-preferences';
import { GoogleConnectionCard } from '@/modules/integrations/components/google-connection-card';
import { NotificationPreferenceForm } from '@/modules/notification/components/notification-preference-form';

function SectionCard({
  id,
  icon,
  title,
  description,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-border bg-surface scroll-mt-24 overflow-hidden rounded-2xl border shadow-sm">
      <header className="border-border-soft flex items-start gap-3 border-b px-5 py-4">
        <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-muted text-xs leading-5">{description}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryRow({
  icon,
  title,
  detail,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-center gap-3 py-3">
      <span className="text-primary shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted block truncate text-xs">{detail}</span>
      </span>
      {href && <ChevronRight size={16} className="text-muted shrink-0" />}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function ConfiguracoesPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  if (!current) return null;

  const container = createServerContainer();
  const heroPhoto = resolveHeroPhoto(current.tenant, 'configuracoes');
  const canManageHeroPhoto = hasPermission(session.authContext, 'tenant:manage');

  const [preference, connection, member, legalStatus] = await Promise.all([
    container.repositories.notificationPreference.findByUserId(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    container.repositories.googleCalendarConnection.findByUserId(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    getLegalAcceptanceStatus(session.authContext),
  ]);

  const publicationSettings = member
    ? await container.repositories.publicationSettings.findByMemberId(
        session.authContext.tenantId,
        member.id,
      )
    : null;

  const channels = preference?.canaisHabilitados ?? ['interno'];
  const profilePublished = publicationSettings?.profilePublished ?? true;
  const legalPending = legalStatus.filter((item) => item.pendente).length;
  const lastAcceptance = legalStatus
    .map((item) => item.aceitoEm)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        kicker="Minha conta"
        title="Configurações do Irmão"
        description="Centralize seu acesso, segurança, privacidade, comunicação, integrações e personalização do Portal."
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

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="grid min-w-0 gap-6 lg:grid-cols-2">
          <SectionCard
            icon={<ShieldCheck size={19} />}
            title="Conta e acesso"
            description="Gerencie seu acesso ao Portal e reforce a segurança da conta."
          >
            <div className="flex flex-col gap-5">
              <div className="border-border bg-background rounded-xl border p-4">
                <p className="text-muted text-xs">E-mail de acesso</p>
                <p className="mt-1 break-all text-sm font-semibold">{session.user.email}</p>
              </div>

              <details className="border-border rounded-xl border p-4">
                <summary className="cursor-pointer text-sm font-semibold">Alterar senha</summary>
                <div className="pt-4">
                  <ChangePasswordForm />
                </div>
              </details>

              <details className="border-border rounded-xl border p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Verificação em duas etapas
                </summary>
                <p className="text-muted mt-1 text-xs">
                  Use um aplicativo autenticador para adicionar uma segunda camada de proteção.
                </p>
                <div className="pt-4">
                  <MfaEnrollmentPanel />
                </div>
              </details>
            </div>
          </SectionCard>

          <SectionCard
            id="perfil-diretorio"
            icon={<UserCircle size={19} />}
            title="Perfil e diretório"
            description="Controle o que os demais Irmãos podem ver no Diretório da Loja."
          >
            {!member ? (
              <p className="text-muted text-sm">
                Sua conta ainda não está vinculada a um cadastro de Irmão.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="border-border bg-background flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <p className="text-sm font-semibold">{member.nomeCompleto}</p>
                    <p className="text-muted text-xs">
                      Perfil no Diretório: {profilePublished ? 'publicado' : 'não publicado'}
                    </p>
                  </div>
                  <Link
                    href="/irmaos/meu-espaco"
                    className="border-primary text-primary hover:bg-primary rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:text-white"
                  >
                    Editar Meu Espaço
                  </Link>
                </div>

                <ConfiguracoesDirectorySettings settings={publicationSettings} />
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<Bell size={19} />}
            title="Comunicações"
            description="Escolha por quais canais deseja receber comunicações do Portal."
          >
            <NotificationPreferenceForm canaisHabilitados={channels} />
          </SectionCard>

          <SectionCard
            icon={<CalendarDays size={19} />}
            title="Agenda e integrações"
            description="Conecte sua agenda pessoal e configure a sincronização com o Portal."
          >
            <GoogleConnectionCard connection={connection} />
          </SectionCard>

          <SectionCard
            icon={<Scale size={19} />}
            title="Privacidade e dados"
            description="Consulte termos, histórico de aceite e exerça seus direitos sobre os dados."
          >
            <div className="flex flex-col gap-3">
              <Link
                href="/irmaos/configuracoes/termos-e-privacidade"
                className="border-border hover:border-primary flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
              >
                <span>
                  <span className="block text-sm font-semibold">Termos e Privacidade</span>
                  <span className="text-muted block text-xs">
                    Documentos vigentes, versões anteriores e seus registros de aceite.
                  </span>
                </span>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </Link>

              <div className="border-border rounded-xl border p-4">
                <p className="text-sm font-semibold">Exclusão da conta de acesso</p>
                <p className="text-muted mt-1 text-xs">
                  A exclusão remove o acesso e dados pessoais vinculados à conta, preservando os
                  registros institucionais que precisam permanecer.
                </p>
                <details className="mt-3">
                  <summary className="text-primary cursor-pointer text-xs font-semibold">
                    Abrir opções de exclusão
                  </summary>
                  <div className="pt-4">
                    <DeleteAccountSection email={session.user.email} />
                  </div>
                </details>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Palette size={19} />}
            title="Aparência e acessibilidade"
            description="Personalize a visualização do Portal neste computador ou dispositivo."
          >
            <PersonalizationPreferences />
          </SectionCard>
        </main>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          <section className="border-border bg-surface rounded-2xl border p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Resumo da conta</h2>
            <div className="divide-border mt-2 flex flex-col divide-y">
              <SummaryRow
                icon={<CheckCircle2 size={18} />}
                title="Conta ativa"
                detail="Acesso autenticado ao Portal"
              />
              <SummaryRow
                icon={<CalendarDays size={18} />}
                title={connection ? 'Google Agenda conectado' : 'Google Agenda não conectado'}
                detail={connection ? connection.googleAccountEmail ?? 'Conta conectada' : 'Conecte sua agenda quando desejar'}
              />
              <SummaryRow
                icon={<Bell size={18} />}
                title={String(channels.length) + (channels.length === 1 ? ' canal ativo' : ' canais ativos')}
                detail={channels.join(', ')}
              />
              <SummaryRow
                icon={<UserCircle size={18} />}
                title={profilePublished ? 'Perfil publicado' : 'Perfil não publicado'}
                detail="Controle a visibilidade no Diretório"
                href="/configuracoes#perfil-diretorio"
              />
              <SummaryRow
                icon={<Scale size={18} />}
                title={legalPending ? String(legalPending) + ' aceite(s) pendente(s)' : 'Termos em dia'}
                detail={lastAcceptance ? 'Último aceite em ' + lastAcceptance.toLocaleDateString('pt-BR') : 'Consulte os documentos vigentes'}
                href="/irmaos/configuracoes/termos-e-privacidade"
              />
            </div>
          </section>

          <section className="border-accent/40 bg-accent/10 rounded-2xl border p-5">
            <div className="flex items-start gap-3">
              <Share2 size={18} className="text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-display font-semibold">Centralização das preferências</h2>
                <p className="text-muted mt-1 text-xs leading-5">
                  Esta tela reúne as configurações pessoais antes espalhadas pelo Portal. O Meu
                  Espaço continua sendo o editor completo dos dados do perfil.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
