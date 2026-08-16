'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { createArchiveExhibitionAction, type ArchiveActionState } from '../actions/archive-actions';

const EMPTY_STATE: ArchiveActionState = { error: null };

export function ArchiveExhibitionForm() {
  const [state, formAction] = useActionState(createArchiveExhibitionAction, EMPTY_STATE);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required />
      </FormField>
      <FormField
        label="Slug"
        htmlFor="slug"
        description="Usado na URL pública (/acervo/exposicoes/seu-slug) — só letras minúsculas, números e hífens."
      >
        <Input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </FormField>
      <FormField label="Descrição editorial (opcional)" htmlFor="descricaoEditorial">
        <Textarea id="descricaoEditorial" name="descricaoEditorial" rows={4} />
      </FormField>
      <FormField label="Curadoria (opcional)" htmlFor="curadoPor">
        <Input id="curadoPor" name="curadoPor" placeholder="Ex.: Secretaria, Biblioteca da Loja" />
      </FormField>
      <FormField label="URL da capa (opcional)" htmlFor="capaUrl">
        <Input id="capaUrl" name="capaUrl" type="url" />
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
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar exposição'}
    </Button>
  );
}
