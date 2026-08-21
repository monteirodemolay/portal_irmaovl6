'use client';

import { useActionState } from 'react';
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
}

export function AnnouncementForm({ action, announcement }: AnnouncementFormProps) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required defaultValue={announcement?.titulo} />
      </FormField>
      <FormField label="Descrição" htmlFor="descricao">
        <Textarea
          id="descricao"
          name="descricao"
          required
          rows={4}
          defaultValue={announcement?.descricao}
        />
      </FormField>
      <FormField label="Prioridade" htmlFor="prioridade">
        <Select
          id="prioridade"
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
        htmlFor="dataExpiracao"
        description="O aviso deixa de aparecer para os Irmãos após essa data."
      >
        <Input
          id="dataExpiracao"
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
