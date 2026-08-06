'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { PermissionKey } from '@vl6/shared';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createApiKeyAction, type CreateApiKeyActionState } from '../actions/api-key-actions';

const INITIAL_STATE: CreateApiKeyActionState = { error: null, plainTextKey: null };

export function CreateApiKeyForm({
  availablePermissions,
}: {
  availablePermissions: readonly PermissionKey[];
}) {
  const [state, formAction] = useActionState(createApiKeyAction, INITIAL_STATE);

  if (state.plainTextKey) {
    return (
      <div className="border-accent/40 bg-accent/10 flex flex-col gap-3 rounded border p-4 text-sm">
        <p>Chave criada. Copie agora — ela não é mostrada de novo:</p>
        <p className="break-all rounded border bg-white/60 p-2 font-mono text-xs">
          {state.plainTextKey}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField
        label="Nome da chave"
        htmlFor="nome"
        description='Ex.: "Sistema de folha de pagamento"'
      >
        <Input id="nome" name="nome" required />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-display mb-1 text-sm font-semibold">Permissões</legend>
        {availablePermissions.map((permission) => (
          <label key={permission} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permissoes" value={permission} />
            <span className="font-mono text-xs">{permission}</span>
          </label>
        ))}
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Criando…' : 'Criar chave'}
    </Button>
  );
}
