'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { News } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ContentActionState } from '../actions/content-actions';

function toDateInputValue(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function extractContentImages(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    if (match[2]) urls.add(match[2].replace(/&amp;/g, '&'));
  }
  return [...urls];
}

function removeContentImage(html: string, url: string): string {
  const figures = html.replace(
    /<figure\b[^>]*>[\s\S]*?<\/figure>/gi,
    (figure) => (figure.includes(url) || figure.includes(url.replace(/&/g, '&amp;')) ? '' : figure),
  );

  return figures
    .replace(/<img\b[^>]*>/gi, (image) =>
      image.includes(url) || image.includes(url.replace(/&/g, '&amp;')) ? '' : image,
    )
    .replace(/<div data-news-gallery="true">\s*<\/div>/gi, '')
    .trim();
}

export interface NewsFormProps {
  action: (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;
  news?: News;
}

export function NewsForm({ action, news }: NewsFormProps) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, { error: null });
  const [contentHtml, setContentHtml] = useState(news?.conteudoHtml ?? '');
  const contentImages = useMemo(() => extractContentImages(contentHtml), [contentHtml]);

  return (
    <form action={formAction} className="flex max-w-4xl flex-col gap-4">
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

      {contentImages.length > 0 && (
        <section className="border-border bg-surface rounded-xl border p-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Imagens da notícia</h2>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Revise as imagens importadas. Use “Remover” nas fotos que não pertencem à matéria;
              a alteração será gravada ao salvar a notícia.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {contentImages.map((url) => (
              <div key={url} className="border-border overflow-hidden rounded-lg border">
                <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                <div className="p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setContentHtml((current) => removeContentImage(current, url))}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <FormField
        label="Conteúdo"
        htmlFor="conteudoHtml"
        description="O HTML permanece disponível para ajustes finos. As imagens também podem ser gerenciadas visualmente acima."
      >
        <Textarea
          id="conteudoHtml"
          name="conteudoHtml"
          required
          rows={14}
          value={contentHtml}
          onChange={(event) => setContentHtml(event.target.value)}
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
