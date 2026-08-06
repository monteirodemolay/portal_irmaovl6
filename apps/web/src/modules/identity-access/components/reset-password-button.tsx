'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@vl6/ui';
import { resetUserPasswordAction, type ResetPasswordActionState } from '../actions/user-actions';

const INITIAL_STATE: ResetPasswordActionState = { error: null, temporaryPassword: null };

export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const action = resetUserPasswordAction.bind(null, userId);
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Resetar senha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
          <DialogDescription>
            Uma nova senha temporária será gerada para <strong>{email}</strong>. A senha atual deixa
            de funcionar imediatamente.
          </DialogDescription>
        </DialogHeader>

        {state.temporaryPassword ? (
          <div className="border-accent/40 bg-accent/10 flex flex-col gap-3 rounded border p-4 text-sm">
            <p>Senha redefinida. Copie agora — ela não é mostrada de novo:</p>
            <p className="break-all rounded border bg-white/60 p-2 font-mono text-xs">
              {state.temporaryPassword}
            </p>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <SubmitButton />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" variant="outline" className="w-fit">
      {pending ? 'Gerando…' : 'Gerar nova senha'}
    </Button>
  );
}
