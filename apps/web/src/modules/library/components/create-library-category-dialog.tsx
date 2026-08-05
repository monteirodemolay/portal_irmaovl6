'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import type { LibraryCategory } from '@vl6/domain';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createLibraryCategoryAction, type LibraryActionState } from '../actions/library-actions';

export function CreateLibraryCategoryDialog({ categories }: { categories: LibraryCategory[] }) {
  const [state, formAction] = useActionState<LibraryActionState, FormData>(
    createLibraryCategoryAction,
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
          <DialogTitle>Nova categoria da Biblioteca</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <FormField label="Nome" htmlFor="nome">
            <Input id="nome" name="nome" required />
          </FormField>
          <FormField
            label="Categoria pai (opcional)"
            htmlFor="categoriaPaiId"
            description="Deixe em branco para criar uma categoria de topo."
          >
            <Select id="categoriaPaiId" name="categoriaPaiId" defaultValue="">
              <option value="">Nenhuma (categoria de topo)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nome}
                </option>
              ))}
            </Select>
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
