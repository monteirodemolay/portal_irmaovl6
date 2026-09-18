'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from '@vl6/ui';
import { deleteLibraryItemAction, type LibraryActionState } from '../actions/library-actions';

export function DeleteLibraryItemDialog({
  itemId,
  title,
  allowPermanent,
}: {
  itemId: string;
  title: string;
  allowPermanent: boolean;
}) {
  const [state, action] = useActionState<LibraryActionState, FormData>(
    deleteLibraryItemAction.bind(null, itemId),
    { error: null },
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          Excluir obra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Excluir “{title}”?</DialogTitle>
            <DialogDescription>
              A exclusão normal retira a obra do catálogo e preserva o motivo e o histórico para
              auditoria. Obras com empréstimo ativo não podem ser excluídas.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            Motivo da exclusão
            <Textarea name="motivo" minLength={10} maxLength={1000} rows={4} required />
          </label>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter className="gap-2 sm:justify-between">
            {allowPermanent && (
              <DeleteSubmit
                name="modo"
                value="permanente"
                label="Excluir teste permanentemente"
                variant="outline"
              />
            )}
            <DeleteSubmit name="modo" value="arquivar" label="Excluir e manter histórico" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSubmit({
  name,
  value,
  label,
  variant = 'destructive',
}: {
  name: string;
  value: string;
  label: string;
  variant?: 'outline' | 'destructive';
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name={name}
      value={value}
      variant={variant}
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? 'Excluindo…' : label}
    </Button>
  );
}
