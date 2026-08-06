'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@vl6/ui';
import type { UserAccountStatus } from '@vl6/domain';
import { setUserStatusAction } from '../actions/user-actions';

export function ToggleUserStatusButton({
  userId,
  statusConta,
}: {
  userId: string;
  statusConta: UserAccountStatus;
}) {
  const blocked = statusConta === 'blocked';
  const action = setUserStatusAction.bind(null, userId, blocked ? 'active' : 'blocked');

  return (
    <form action={action}>
      <SubmitButton blocked={blocked} />
    </form>
  );
}

function SubmitButton({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className={blocked ? 'text-emerald-700' : 'text-red-600'}
    >
      {pending ? 'Aguarde…' : blocked ? 'Reativar' : 'Bloquear'}
    </Button>
  );
}
