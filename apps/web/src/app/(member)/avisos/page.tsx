import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { CentralDeAvisos } from '@/modules/notification/components/central-de-avisos';

/**
 * Central de Avisos — reúne avisos oficiais da Gestão e notificações
 * automáticas do Portal num único ambiente (docs/architecture), sem
 * misturar o conteúdo da Agenda. Substitui a antiga tela só de "Avisos"
 * nesta mesma rota (`/avisos`), preservando o link já existente no menu e
 * no sino.
 */
export default async function AvisosPage() {
  const session = await requireSession();
  const container = createServerContainer();

  const page = await container.useCases.listMyNotifications.execute(session.authContext, {
    limit: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-accent text-xs font-semibold uppercase tracking-wide">
          Comunicação institucional
        </span>
        <h1 className="font-display text-2xl font-semibold">Central de Avisos</h1>
        <p className="text-muted max-w-xl text-sm">
          Avisos oficiais da Gestão e notificações automáticas do Portal, reunidos com clareza em um
          único ambiente.
        </p>
      </div>
      <CentralDeAvisos notifications={page.items} />
    </div>
  );
}
