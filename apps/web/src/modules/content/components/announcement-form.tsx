'use client';

import { useId, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Announcement } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ContentActionState } from '../actions/content-actions';

function toDateInputValue(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface AnnouncementFormProps {
  action: (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;
  announcement?: Announcement;
  initialTitle?: string;
}

export function AnnouncementForm({ action, announcement, initialTitle }: AnnouncementFormProps) {
  const formId = useId();
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor={`${formId}-titulo`}>
        <Input
          id={`${formId}-titulo`}
          name="titulo"
          required
          defaultValue={announcement?.titulo ?? initialTitle}
        />
      </FormField>
      <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
        <Textarea
          id={`${formId}-descricao`}
          name="descricao"
          required
          rows={4}
          defaultValue={announcement?.descricao}
        />
      </FormField>
      <FormField label="Prioridade" htmlFor={`${formId}-prioridade`}>
        <Select
          id={`${formId}-prioridade`}
          name="prioridade"
          defaultValue={announcement?.prioridade ?? 'media'}
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </Select>
      </FormField>
      <FormField
        label="Data de expiração (opcional)"
        htmlFor={`${formId}-dataExpiracao`}
        description="O aviso deixa de aparecer para os Irmãos após essa data."
      >
        <Input
          id={`${formId}-dataExpiracao`}
          name="dataExpiracao"
          type="date"
          defaultValue={toDateInputValue(announcement?.dataExpiracao ?? null)}
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="destacar"
          className="h-4 w-4"
          defaultChecked={announcement?.destacar}
        />
        Destacar no topo (máximo 3 avisos destacados simultâneos)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requiresAcknowledgement"
          className="h-4 w-4"
          defaultChecked={announcement?.requiresAcknowledgement}
        />
        Exigir confirmação de ciência de cada Irmão na Central de Avisos
      </label>
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
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
