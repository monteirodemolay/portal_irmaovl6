'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { EVENT_KINDS, EVENT_KIND_LABELS } from '@vl6/shared';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createEventAction, type AgendaActionState } from '../actions/agenda-actions';

export function EventForm() {
  const [state, formAction] = useActionState<AgendaActionState, FormData>(createEventAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Tipo" htmlFor="tipo">
        <Select id="tipo" name="tipo" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {EVENT_KINDS.filter((kind) => kind !== 'aniversario').map((kind) => (
            <option key={kind} value={kind}>
              {EVENT_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required />
      </FormField>
      <FormField label="Descrição (opcional)" htmlFor="descricao">
        <Textarea id="descricao" name="descricao" rows={3} />
      </FormField>
      <FormField label="Local" htmlFor="local">
        <Input id="local" name="local" required />
      </FormField>
      <FormField label="Início" htmlFor="dataInicio">
        <Input id="dataInicio" name="dataInicio" type="datetime-local" required />
      </FormField>
      <FormField label="Fim" htmlFor="dataFim">
        <Input id="dataFim" name="dataFim" type="datetime-local" required />
      </FormField>
      <FormField
        label="Capacidade máxima (opcional)"
        htmlFor="capacidadeMaxima"
        description="Confirmações além do limite entram em lista de espera automaticamente."
      >
        <Input id="capacidadeMaxima" name="capacidadeMaxima" type="number" min={1} />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="exigeConfirmacaoPresenca" className="h-4 w-4" />
        Exigir confirmação de presença
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
      {pending ? 'Criando…' : 'Criar evento'}
    </Button>
  );
}
