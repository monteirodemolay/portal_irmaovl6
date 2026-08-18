'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { InspirationalQuote } from '@vl6/domain';
import { Button, Textarea, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ContentActionState } from '../actions/content-actions';

export interface QuoteFormProps {
  action: (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;
  quote?: InspirationalQuote;
}

/** Frase e autor sempre editados juntos — o vínculo é o próprio formulário. */
export function QuoteForm({ action, quote }: QuoteFormProps) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Frase" htmlFor="texto">
        <Textarea id="texto" name="texto" required rows={3} defaultValue={quote?.texto} />
      </FormField>
      <FormField
        label="Autor"
        htmlFor="autor"
        description="Pode ser um pensador reconhecido, a tradição maçônica ou um Irmão da própria Loja."
      >
        <Input id="autor" name="autor" required defaultValue={quote?.autor} />
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
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
