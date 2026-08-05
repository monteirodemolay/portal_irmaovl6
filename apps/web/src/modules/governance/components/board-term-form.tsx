'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createBoardTermAction, type GovernanceActionState } from '../actions/governance-actions';

export function BoardTermForm() {
  const [state, formAction] = useActionState<GovernanceActionState, FormData>(
    createBoardTermAction,
    {
      error: null,
    },
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <FormField label="Nome da gestão" htmlFor="nome" description='Ex.: "Gestão 2026/2027"'>
        <Input id="nome" name="nome" required />
      </FormField>
      <FormField label="Início do período" htmlFor="periodoInicio">
        <Input id="periodoInicio" name="periodoInicio" type="date" required />
      </FormField>
      <FormField label="Fim do período" htmlFor="periodoFim">
        <Input id="periodoFim" name="periodoFim" type="date" required />
      </FormField>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar gestão'}
    </Button>
  );
}
