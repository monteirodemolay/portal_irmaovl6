'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Textarea,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createLibraryShelfAction, type LibraryActionState } from '../actions/library-actions';

export function CreateLibraryShelfDialog({
  className,
  onCreated,
}: {
  className?: string;
  onCreated?: (shelf: { id: string; codigo: string; nome: string }) => void;
}) {
  const [state, formAction] = useActionState<LibraryActionState, FormData>(
    createLibraryShelfAction,
    { error: null },
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.createdShelf) return;
    formRef.current?.reset();
    onCreated?.(state.createdShelf);
    setOpen(false);
  }, [onCreated, state.createdShelf]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={className}>
          Nova estante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova estante da Biblioteca</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <FormField label="Código" htmlFor="shelf-code">
            <Input id="shelf-code" name="codigo" required placeholder="Ex.: A-01" />
          </FormField>
          <FormField label="Nome" htmlFor="shelf-name">
            <Input id="shelf-name" name="nome" required placeholder="Ex.: Filosofia" />
          </FormField>
          <FormField label="Descrição (opcional)" htmlFor="shelf-description">
            <Textarea id="shelf-description" name="descricao" rows={3} />
          </FormField>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <ShelfSubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShelfSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-fit">
      {pending ? 'Criando…' : 'Criar estante'}
    </Button>
  );
}
