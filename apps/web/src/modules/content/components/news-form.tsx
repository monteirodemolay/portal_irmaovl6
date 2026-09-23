'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { News } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ContentActionState } from '../actions/content-actions';

function toDateInputValue(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

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

      <div className="border-border bg-surface grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="destaque"
            defaultChecked={Boolean(news?.destaque)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <strong className="block">Destaque</strong>
            <span className="text-muted text-xs">
              Exibe a matéria entre os destaques editoriais do Portal.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="destaquePrincipal"
            defaultChecked={Boolean(news?.destaquePrincipal)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <strong className="block">Destaque principal</strong>
            <span className="text-muted text-xs">
              Torna esta a manchete principal e substitui automaticamente a anterior.
            </span>
          </span>
        </label>
      </div>
      <FormField
        label="Data de publicação"
        htmlFor="dataPublicacao"
        description="Aparece nas Notícias para os Irmãos. Deixe em branco para usar a data em que a notícia for publicada aqui no Portal — corrija aqui quando a notícia já foi veiculada antes, como as importadas do site VL6."
      >
        <Input
          id="dataPublicacao"
          name="dataPublicacao"
          type="date"
          defaultValue={toDateInputValue(news?.dataPublicacao ?? null)}
        />
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
