'use client';

import { useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import type { ArchiveCatalogEntry } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  updateArchiveCatalogEntryAction,
  type ArchiveActionState,
} from '../actions/archive-actions';
import { TagSuggestions } from './tag-suggestions';

const EMPTY_STATE: ArchiveActionState = { error: null };

export function ArchiveCatalogEntryEditForm({
  entry,
  itemLabel,
  existingTags,
}: {
  entry: ArchiveCatalogEntry;
  itemLabel: string;
  existingTags: string[];
}) {
  const boundAction = updateArchiveCatalogEntryAction.bind(null, entry.id);
  const [state, formAction] = useActionState(boundAction, EMPTY_STATE);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="origemId" value={entry.origemId} />
      <FormField label="Item do Acervo" htmlFor="itemLabel">
        <Input id="itemLabel" value={itemLabel} disabled readOnly />
      </FormField>
      <FormField label="Título curado (opcional)" htmlFor="tituloCurado">
        <Input
          id="tituloCurado"
          name="tituloCurado"
          maxLength={200}
          defaultValue={entry.tituloCurado ?? ''}
        />
      </FormField>
      <FormField label="Contexto histórico (opcional)" htmlFor="contextoHistorico">
        <Textarea
          id="contextoHistorico"
          name="contextoHistorico"
          rows={6}
          maxLength={8000}
          defaultValue={entry.contextoHistorico ?? ''}
        />
      </FormField>
      <FormField label="Tags (opcional)" htmlFor="tags" description="Separadas por vírgula.">
        <Input id="tags" name="tags" defaultValue={entry.tags.join(', ')} ref={tagsInputRef} />
      </FormField>
      <TagSuggestions existingTags={existingTags} inputRef={tagsInputRef} />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar alterações'}
    </Button>
  );
}
