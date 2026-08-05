'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { News } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ContentActionState } from '../actions/content-actions';

export interface NewsFormProps {
  action: (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;
  news?: News;
}

export function NewsForm({ action, news }: NewsFormProps) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required defaultValue={news?.titulo} />
      </FormField>
      <FormField label="Subtítulo" htmlFor="subtitulo">
        <Input id="subtitulo" name="subtitulo" defaultValue={news?.subtitulo ?? ''} />
      </FormField>
      <FormField
        label="Slug"
        htmlFor="slug"
        description="Deixe em branco para gerar a partir do título."
      >
        <Input id="slug" name="slug" defaultValue={news?.slug ?? ''} />
      </FormField>
      <FormField label="Categoria" htmlFor="categoria">
        <Input id="categoria" name="categoria" required defaultValue={news?.categoria ?? ''} />
      </FormField>
      <FormField label="URL da imagem de capa" htmlFor="imagemCapaUrl">
        <Input id="imagemCapaUrl" name="imagemCapaUrl" defaultValue={news?.imagemCapaUrl ?? ''} />
      </FormField>
      <FormField label="Conteúdo" htmlFor="conteudoHtml">
        <Textarea
          id="conteudoHtml"
          name="conteudoHtml"
          required
          rows={10}
          defaultValue={news?.conteudoHtml ?? ''}
        />
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
