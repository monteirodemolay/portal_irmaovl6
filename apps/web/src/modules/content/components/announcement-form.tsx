'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createAnnouncementAction, type ContentActionState } from '../actions/content-actions';

export function AnnouncementForm() {
  const [state, formAction] = useActionState<ContentActionState, FormData>(
    createAnnouncementAction,
    {
      error: null,
    },
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required />
      </FormField>
      <FormField label="Descrição" htmlFor="descricao">
        <Textarea id="descricao" name="descricao" required rows={4} />
      </FormField>
      <FormField label="Prioridade" htmlFor="prioridade">
        <Select id="prioridade" name="prioridade" defaultValue="media">
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </Select>
      </FormField>
      <FormField
        label="Data de expiração (opcional)"
        htmlFor="dataExpiracao"
        description="O aviso deixa de aparecer para os Irmãos após essa data."
      >
        <Input id="dataExpiracao" name="dataExpiracao" type="date" />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="destacar" className="h-4 w-4" />
        Destacar no topo (máximo 3 avisos destacados simultâneos)
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar aviso'}
    </Button>
  );
}
