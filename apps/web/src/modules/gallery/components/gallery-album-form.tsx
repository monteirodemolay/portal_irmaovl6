'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createGalleryAlbumAction, type GalleryActionState } from '../actions/gallery-actions';

export function GalleryAlbumForm() {
  const [state, formAction] = useActionState<GalleryActionState, FormData>(
    createGalleryAlbumAction,
    { error: null },
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required />
      </FormField>
      <FormField
        label="Categoria"
        htmlFor="categoria"
        description='Ex.: "Sessão Solene", "Confraternização", "Visita".'
      >
        <Input id="categoria" name="categoria" required />
      </FormField>
      <FormField label="Data do evento" htmlFor="dataEvento">
        <Input id="dataEvento" name="dataEvento" type="date" required />
      </FormField>
      <FormField label="URL da capa (opcional)" htmlFor="capaUrl">
        <Input id="capaUrl" name="capaUrl" type="url" placeholder="https://…" />
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
      {pending ? 'Criando…' : 'Criar álbum'}
    </Button>
  );
}
