'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { BoardTerm } from '@vl6/domain';
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
import { updateBoardTermAction, type GovernanceActionState } from '../actions/governance-actions';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Corrige nome/período de uma gestão já cadastrada — pedido direto do
 * Administrador: o nome deveria trazer só o ano ("2026/2027"), sem a
 * palavra "Gestão", porque a UI já antepõe "Gestão" em vários lugares
 * (perfil do Irmão, linha do tempo) e duplicava ("Gestão Gestão 2026/2027").
 */
export function EditBoardTermDialog({ term }: { term: BoardTerm }) {
  const boundAction = updateBoardTermAction.bind(null, term.id);
  const [state, formAction] = useActionState<GovernanceActionState, FormData>(boundAction, {
    error: null,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar gestão</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex max-w-sm flex-col gap-4">
          <FormField
            label="Nome da gestão"
            htmlFor="nome"
            description='Só o ano — ex.: "2026/2027". A palavra "Gestão" já aparece automaticamente onde for exibido.'
          >
            <Input id="nome" name="nome" required defaultValue={term.nome} />
          </FormField>
          <FormField label="Início do período" htmlFor="periodoInicio">
            <Input
              id="periodoInicio"
              name="periodoInicio"
              type="date"
              required
              defaultValue={toDateInputValue(term.periodoInicio)}
            />
          </FormField>
          <FormField label="Fim do período" htmlFor="periodoFim">
            <Input
              id="periodoFim"
              name="periodoFim"
              type="date"
              required
              defaultValue={toDateInputValue(term.periodoFim)}
            />
          </FormField>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              id="permitirSobreposicao"
              name="permitirSobreposicao"
              className="mt-0.5"
            />
            <span>
              Sei que o período se sobrepõe a outra gestão já cadastrada, e é intencional (ex.:
              troca de Venerável Mestre no meio do ano) — permitir mesmo assim.
            </span>
          </label>
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
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
