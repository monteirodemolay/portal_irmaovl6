'use client';

import { useTransition } from 'react';
import { Button, RefreshCw } from '@vl6/ui';
import { syncRolePermissionsAction } from '../actions/user-actions';

/**
 * Reaplica o seed de permissões do sistema a um papel `sistemico = true` já
 * persistido — corrige papéis de tenants antigos que não têm chaves de
 * permissão adicionadas depois da criação do tenant.
 */
export function SyncRolePermissionsButton({ roleId }: { roleId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => syncRolePermissionsAction(roleId))}
    >
      <RefreshCw size={13} className={isPending ? 'animate-spin' : undefined} />
      {isPending ? 'Sincronizando…' : 'Sincronizar com o padrão'}
    </Button>
  );
}
