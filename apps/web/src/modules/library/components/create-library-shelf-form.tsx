'use client';
import { useActionState } from 'react';
import { Button, Card, CardContent, Input, Textarea } from '@vl6/ui';
import { createLibraryShelfAction, type LibraryActionState } from '../actions/library-actions';
export function CreateLibraryShelfForm() {
  const [state, action] = useActionState<LibraryActionState, FormData>(createLibraryShelfAction, {
    error: null,
  });
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <h2 className="font-semibold">Nova estante</h2>
        <form action={action} className="grid gap-3 sm:grid-cols-[130px_1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-xs">
            Código
            <Input name="codigo" required />
          </label>
          <label className="grid gap-1 text-xs">
            Nome
            <Input name="nome" required />
          </label>
          <label className="grid gap-1 text-xs">
            Descrição
            <Textarea name="descricao" rows={1} />
          </label>
          <Button>Cadastrar</Button>
        </form>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      </CardContent>
    </Card>
  );
}
