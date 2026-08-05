'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Committee, Member } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { GovernanceActionState } from '../actions/governance-actions';

export function CommitteeForm({
  action,
  members,
  committee,
}: {
  action: (state: GovernanceActionState, formData: FormData) => Promise<GovernanceActionState>;
  members: Member[];
  committee?: Committee;
}) {
  const [state, formAction] = useActionState<GovernanceActionState, FormData>(action, {
    error: null,
  });
  const selectedIds = new Set(committee?.membrosIds ?? []);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Nome" htmlFor="nome">
        <Input id="nome" name="nome" required defaultValue={committee?.nome} />
      </FormField>
      <FormField label="Descrição (opcional)" htmlFor="descricao">
        <Textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={committee?.descricao ?? ''}
        />
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Membros</legend>
        <div className="border-border flex max-h-48 flex-col gap-1 overflow-y-auto rounded border p-3">
          {members.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="membrosIds"
                value={member.id}
                className="h-4 w-4"
                defaultChecked={selectedIds.has(member.id)}
              />
              {member.nomeCompleto}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton label={committee ? 'Salvar alterações' : 'Criar comissão'} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Salvando…' : label}
    </Button>
  );
}
