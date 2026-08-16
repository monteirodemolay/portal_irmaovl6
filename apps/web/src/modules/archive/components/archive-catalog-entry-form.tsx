'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createArchiveCatalogEntryAction,
  type ArchiveActionState,
} from '../actions/archive-actions';

const EMPTY_STATE: ArchiveActionState = { error: null };

export interface ArchiveCatalogEntryFormItem {
  compositeId: string;
  title: string;
  kindLabel: string;
}

export function ArchiveCatalogEntryForm({ items }: { items: ArchiveCatalogEntryFormItem[] }) {
  const [state, formAction] = useActionState(createArchiveCatalogEntryAction, EMPTY_STATE);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Item do Acervo" htmlFor="origemId">
        <Select id="origemId" name="origemId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {items.map((item) => (
            <option key={item.compositeId} value={item.compositeId}>
              {item.kindLabel} · {item.title}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Título curado (opcional)" htmlFor="tituloCurado">
        <Input id="tituloCurado" name="tituloCurado" maxLength={200} />
      </FormField>
      <FormField label="Contexto histórico (opcional)" htmlFor="contextoHistorico">
        <Textarea id="contextoHistorico" name="contextoHistorico" rows={6} maxLength={8000} />
      </FormField>
      <FormField label="Tags (opcional)" htmlFor="tags" description="Separadas por vírgula.">
        <Input id="tags" name="tags" />
      </FormField>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar ficha'}
    </Button>
  );
}
