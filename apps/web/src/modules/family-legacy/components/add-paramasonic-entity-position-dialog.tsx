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
  Plus,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createParamasonicEntityPositionAction,
  type ParamasonicEntityActionState,
} from '../actions/paramasonic-entity-actions';

export function AddParamasonicEntityPositionDialog({ entityId }: { entityId: string }) {
  const boundAction = createParamasonicEntityPositionAction.bind(null, entityId);
  const [state, formAction] = useActionState<ParamasonicEntityActionState, FormData>(boundAction, {
    error: null,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus size={14} />
          Cadastrar cargo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar cargo</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <FormField
            label="Nome do cargo"
            htmlFor="nome"
            description="Ex.: Presidência, Secretaria, Tesouraria. Fica disponível pra seleção ao adicionar integrantes."
          >
            <Input id="nome" name="nome" required placeholder="Ex.: Presidência" />
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
      {pending ? 'Cadastrando…' : 'Cadastrar'}
    </Button>
  );
}
