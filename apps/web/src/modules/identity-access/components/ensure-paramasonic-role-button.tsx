import { Button } from '@vl6/ui';
import { ensureParamasonicRoleAction } from '../actions/paramasonic-role-actions';

export function EnsureParamasonicRoleButton() {
  return (
    <form action={ensureParamasonicRoleAction}>
      <Button type="submit" variant="outline">
        Criar ou atualizar acesso paramaçônico
      </Button>
    </form>
  );
}
