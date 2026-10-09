import { Suspense, type ComponentProps } from 'react';
import type { AuthContext } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { TopbarUser } from './topbar-user';

type Props = Omit<ComponentProps<typeof TopbarUser>, 'notifications'> & { authContext: AuthContext };

async function LoadedTopbarUser({ authContext, ...props }: Props) {
  const container = createServerContainer();
  const notifications = await container.useCases.listMyNotifications.execute(authContext, { limit: 20 });
  return <TopbarUser {...props} notifications={notifications.items} />;
}

/** Optional notification content streams without holding the entire navigation shell. */
export function ServerTopbarUser(props: Props) {
  return (
    <Suspense fallback={<p role="status" className="text-muted text-xs">Carregando notificações…</p>}>
      <LoadedTopbarUser {...props} />
    </Suspense>
  );
}
