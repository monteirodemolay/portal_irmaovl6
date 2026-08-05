'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createFileCategoryAction,
  type DocumentManagementActionState,
} from '../actions/document-management-actions';

export function CreateFileCategoryDialog() {
  const [state, formAction] = useActionState<DocumentManagementActionState, FormData>(
    createFileCategoryAction,
    { error: null },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Nova Categoria</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova categoria de Arquivos</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome">
            <Input id="nome" name="nome" required />
          </FormField>
          <FormField
            label="Acervo (opcional)"
            htmlFor="acervo"
            description='Ex.: "Atas", "Balancetes" — livre, usado para agrupar visualmente.'
          >
            <Input id="acervo" name="acervo" />
          </FormField>
          <FormField label="Ordem" htmlFor="ordem">
            <Input id="ordem" name="ordem" type="number" min={0} defaultValue={0} />
          </FormField>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar categoria'}
    </Button>
  );
}
