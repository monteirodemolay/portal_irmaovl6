'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Event } from '@vl6/domain';
import { EVENT_KINDS, EVENT_KIND_LABELS } from '@vl6/shared';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ResolvedArchiveItem } from '@/modules/archive/lib/resolve-archive-item';
import { AgendaAttachmentPicker } from './agenda-attachment-picker';
import {
  createEventAction,
  updateEventAction,
  type AgendaActionState,
} from '../actions/agenda-actions';

const EMPTY_STATE: AgendaActionState = { error: null };

function toDatetimeLocalValue(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function EventForm({
  event,
  initialAttachments = [],
}: {
  /** Presente = modo edição (pré-preenche e salva via `updateEventAction`); ausente = criação. */
  event?: Event;
  initialAttachments?: ResolvedArchiveItem[];
}) {
  const action = event ? updateEventAction.bind(null, event.id) : createEventAction;
  const [state, formAction] = useActionState<AgendaActionState, FormData>(action, EMPTY_STATE);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Tipo" htmlFor="tipo">
        <Select id="tipo" name="tipo" required defaultValue={event?.tipo ?? ''}>
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
        <Input id="titulo" name="titulo" required defaultValue={event?.titulo} />
      </FormField>
      <FormField label="Descrição (opcional)" htmlFor="descricao">
        <Textarea id="descricao" name="descricao" rows={3} defaultValue={event?.descricao ?? ''} />
      </FormField>
      <FormField label="Local" htmlFor="local">
        <Input id="local" name="local" required defaultValue={event?.local} />
      </FormField>
      <FormField label="Início" htmlFor="dataInicio">
        <Input
          id="dataInicio"
          name="dataInicio"
          type="datetime-local"
          required
          defaultValue={event ? toDatetimeLocalValue(event.dataInicio) : undefined}
        />
      </FormField>
      <FormField
        label="Fim (opcional)"
        htmlFor="dataFim"
        description="Deixe em branco quando não houver horário de encerramento definido (comum em sessões)."
      >
        <Input
          id="dataFim"
          name="dataFim"
          type="datetime-local"
          defaultValue={event ? toDatetimeLocalValue(event.dataFim) : undefined}
        />
      </FormField>
      <FormField
        label="Capacidade máxima (opcional)"
        htmlFor="capacidadeMaxima"
        description="Confirmações além do limite entram em lista de espera automaticamente."
      >
        <Input
          id="capacidadeMaxima"
          name="capacidadeMaxima"
          type="number"
          min={1}
          defaultValue={event?.capacidadeMaxima ?? undefined}
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="exigeConfirmacaoPresenca"
          className="h-4 w-4"
          defaultChecked={event?.exigeConfirmacaoPresenca}
        />
        Exigir confirmação de presença
      </label>

      <FormField
        label="Traje (opcional)"
        htmlFor="traje"
        description='Ex.: "Social completo (terno escuro)".'
      >
        <Input id="traje" name="traje" defaultValue={event?.traje ?? ''} />
      </FormField>
      <FormField
        label="Chegada sugerida (opcional)"
        htmlFor="chegadaSugerida"
        description='Ex.: "19:30, para preparação".'
      >
        <Input
          id="chegadaSugerida"
          name="chegadaSugerida"
          defaultValue={event?.chegadaSugerida ?? ''}
        />
      </FormField>
      <FormField label="Observações (opcional)" htmlFor="observacoes">
        <Textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          defaultValue={event?.observacoes ?? ''}
        />
      </FormField>

      <FormField
        label="Arquivos relacionados (opcional)"
        htmlFor="arquivosRelacionados-input"
        description="Aponta para itens já existentes no Acervo VL6 — não faz upload aqui."
      >
        <AgendaAttachmentPicker
          initial={initialAttachments.map((item) => ({
            compositeId: item.compositeId,
            titulo: item.titulo,
            kindLabel: item.kindLabel,
            viewHref: item.viewHref,
          }))}
        />
      </FormField>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton isEditing={Boolean(event)} />
    </form>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar evento'}
    </Button>
  );
}
