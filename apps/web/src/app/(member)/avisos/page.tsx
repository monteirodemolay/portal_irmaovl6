import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { PageHero } from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { CentralDeAvisos } from '@/modules/notification/components/central-de-avisos';

/**
 * Central de Avisos — reúne avisos oficiais da Gestão e notificações
 * automáticas do Portal num único ambiente (docs/architecture), sem
 * misturar o conteúdo da Agenda. Substitui a antiga tela só de "Avisos"
 * nesta mesma rota (`/avisos`), preservando o link já existente no menu e
 * no sino.
 */
export default async function AvisosPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  if (!current) return null;
  const container = createServerContainer();

  const page = await container.useCases.listMyNotifications.execute(session.authContext, {
    limit: 200,
  });

  const canManageHeroPhoto = hasPermission(session.authContext, 'tenant:manage');
  const heroPhoto = resolveHeroPhoto(current.tenant, 'avisos');

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        kicker="Comunicação institucional"
        title="Central de Notificações"
        description="Avisos oficiais da Gestão e notificações automáticas do Portal, reunidos com clareza em um único ambiente."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          canManageHeroPhoto && (
            <PageHeroPhotoUpload
              pageKey="avisos"
              path="/avisos"
              hasPhoto={Boolean(heroPhoto)}
              initialPosicao={heroPhoto?.posicao ?? 50}
            />
          )
        }
      />
      <CentralDeAvisos notifications={page.items} />
    </div>
  );
}
