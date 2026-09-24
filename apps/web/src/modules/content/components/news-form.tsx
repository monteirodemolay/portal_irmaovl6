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

export interface NewsEventOption {
  id: string;
  titulo: string;
  dataInicio: string;
  local: string;
  tipo: string;
}

function normalizeWords(value: string): string[] {
  const ignored = new Set([
    'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
    'para', 'por', 'com', 'uma', 'um', 'nº', '06', 'verdadeira', 'luz',
  ]);
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !ignored.has(word));
}

function scoreEventSuggestion(
  event: NewsEventOption,
  title: string,
  publicationDate: string,
): number {
  const titleWords = new Set(normalizeWords(title));
  const eventWords = normalizeWords(event.titulo);
  const overlap = eventWords.filter((word) => titleWords.has(word)).length;

  let dateScore = 0;
  if (publicationDate) {
    const publication = Date.parse(publicationDate + 'T12:00:00Z');
    const eventDate = Date.parse(event.dataInicio);
    if (Number.isFinite(publication) && Number.isFinite(eventDate)) {
      const days = Math.abs(publication - eventDate) / 86_400_000;
      if (days <= 7) dateScore = Math.max(0, 80 - days * 10);
    }
  }

  return dateScore + overlap * 20;
}

function formatEventOptionDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export interface NewsFormProps {
  action: (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;
  news?: News;
  events?: NewsEventOption[];
}

export function NewsForm({ action, news, events = [] }: NewsFormProps) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, { error: null });
  const [contentHtml, setContentHtml] = useState(news?.conteudoHtml ?? '');
  const [title, setTitle] = useState(news?.titulo ?? '');
  const [publicationDate, setPublicationDate] = useState(
    toDateInputValue(news?.dataPublicacao ?? null) ?? '',
  );
  const [selectedEventId, setSelectedEventId] = useState(news?.eventId ?? '');
  const contentImages = useMemo(() => extractContentImages(contentHtml), [contentHtml]);

  const suggestedEvents = useMemo(
    () =>
      events
        .map((event) => ({ event, score: scoreEventSuggestion(event, title, publicationDate) }))
        .filter(({ score }) => score >= 35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ event }) => event),
    [events, title, publicationDate],
  );

  return (
    <form action={formAction} className="flex max-w-4xl flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input
          id="titulo"
          name="titulo"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
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
        description="Data editorial da matéria. Ela é independente da data histórica do acontecimento relacionado."
      >
        <Input
          id="dataPublicacao"
          name="dataPublicacao"
          type="date"
          value={publicationDate}
          onChange={(event) => setPublicationDate(event.target.value)}
        />
      </FormField>

      <section className="border-border bg-surface rounded-xl border p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Contexto histórico no Acervo VL6</h2>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Vincule a notícia ao Evento ou Sessão que realmente originou a matéria. A data editorial
            permanece própria da notícia; a data histórica é sempre a data do Evento. Se não houver
            correspondência, deixe sem vínculo: a matéria será publicada normalmente e continuará
            pesquisável como memória editorial.
          </p>
        </div>

        {suggestedEvents.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold">Sugestões automáticas para conferência</p>
            <div className="mt-2 grid gap-2">
              {suggestedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={
                    'border-border hover:border-primary rounded-lg border p-3 text-left text-sm transition-colors ' +
                    (selectedEventId === event.id ? 'border-primary bg-primary/5' : '')
                  }
                >
                  <span className="font-semibold">{event.titulo}</span>
                  <span className="text-muted mt-1 block text-xs">
                    {formatEventOptionDate(event.dataInicio)} · {event.local}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-muted mt-2 text-[11px]">
              A sugestão usa proximidade de data e palavras do título. O sistema nunca confirma o
              vínculo sozinho.
            </p>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="eventId" className="mb-1.5 block text-sm font-medium">
            Evento/Sessão relacionado
          </label>
          <select
            id="eventId"
            name="eventId"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            className="border-border bg-background text-foreground h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Sem evento relacionado — manter como memória editorial</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {formatEventOptionDate(event.dataInicio)} — {event.titulo}
              </option>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {selectedEventId && (
              <button
                type="button"
                onClick={() => setSelectedEventId('')}
                className="text-muted hover:text-foreground underline"
              >
                Remover vínculo
              </button>
            )}
            <a
              href="/admin/conteudo/agenda/novo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold hover:underline"
            >
              Nenhum evento corresponde? Criar Evento/Sessão ↗
            </a>
          </div>
        </div>
      </section>

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
