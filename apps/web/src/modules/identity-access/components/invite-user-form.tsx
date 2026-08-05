'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Role } from '@vl6/domain';
import { Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { inviteUserAction, type InviteUserActionState } from '../actions/user-actions';

export function InviteUserForm({ roles }: { roles: Role[] }) {
  const [state, formAction] = useActionState<InviteUserActionState, FormData>(inviteUserAction, {
    error: null,
    temporaryPassword: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </FormField>
      <FormField label="Papel" htmlFor="roleId">
        <Select id="roleId" name="roleId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.nome}
            </option>
          ))}
        </Select>
      </FormField>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.temporaryPassword && (
        <p className="border-accent/40 bg-accent/10 rounded border p-3 text-sm">
          Conta criada. Senha temporária:{' '}
          <strong className="font-mono">{state.temporaryPassword}</strong>
          {' — '}repasse ao Irmão com segurança; ele pode trocá-la pelo fluxo de recuperação de
          senha.
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Convidando…' : 'Convidar'}
    </Button>
  );
}
