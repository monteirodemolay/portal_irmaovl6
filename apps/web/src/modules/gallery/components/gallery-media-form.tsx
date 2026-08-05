'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { GALLERY_MEDIA_KINDS, GALLERY_MEDIA_KIND_LABELS } from '@vl6/shared';
import { Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { addGalleryMediaAction, type GalleryActionState } from '../actions/gallery-actions';

export function GalleryMediaForm({ albumId }: { albumId: string }) {
  const boundAction = addGalleryMediaAction.bind(null, albumId);
  const [state, formAction] = useActionState<GalleryActionState, FormData>(boundAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField label="Tipo" htmlFor="tipo">
        <Select id="tipo" name="tipo" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {GALLERY_MEDIA_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {GALLERY_MEDIA_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Arquivo" htmlFor="file">
        <input
          id="file"
          name="file"
          type="file"
          accept="image/*,video/*"
          required
          className="border-border bg-surface w-full rounded border px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Ordem" htmlFor="ordem">
        <Input id="ordem" name="ordem" type="number" min={0} defaultValue={0} />
      </FormField>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Enviando…' : 'Enviar mídia'}
    </Button>
  );
}
