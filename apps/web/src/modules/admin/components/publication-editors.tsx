'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import type { Announcement, News } from '@vl6/domain';
import { AnnouncementForm } from '@/modules/content/components/announcement-form';
import { NewsForm, type NewsEventOption } from '@/modules/content/components/news-form';
import {
  createWorkspaceAnnouncementAction,
  createWorkspaceNewsAction,
  updateWorkspaceAnnouncementAction,
  updateWorkspaceNewsAction,
  type ContentActionState,
} from '@/modules/content/actions/content-actions';
import {
  createWorkspaceArtAction,
  saveWorkspaceInstagramLinksAction,
  linkWorkspaceContentAction,
  setWorkspacePublicationAction,
} from '../actions/publication-workspace-actions';

export function WorkspaceArtForm({
  eventId,
  templates,
}: {
  eventId: string;
  templates: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createWorkspaceArtAction.bind(null, eventId), {
    error: null,
  });
  return (
    <form action={action} className="space-y-3">
      <label className="text-sm font-medium">
        Modelo de arte
        <select
          name="templateId"
          required
          defaultValue=""
          className="border-border bg-surface mt-2 block w-full rounded-lg border p-2"
        >
          <option value="" disabled>
            Selecione um modelo
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <ActionSubmit label="Preparar arte deste acontecimento" />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

export function WorkspaceInstagramForm({ eventId, news }: { eventId: string; news: News }) {
  const editor = useSavedEditor(saveWorkspaceInstagramLinksAction.bind(null, eventId, news.id));
  const [state, action] = useActionState(editor.action, { error: null });
  return (
    <form
      action={action}
      onChange={() => editor.setDirty(true)}
      className="border-border mt-5 space-y-3 rounded-lg border p-4"
    >
      <label className="text-sm font-medium">
        Publicações externas relacionadas
        <textarea
          name="instagramUrls"
          rows={3}
          defaultValue={(news.instagramUrls ?? []).join('\n')}
          placeholder="https://www.instagram.com/p/..."
          className="border-border mt-2 block w-full rounded-lg border p-2"
        />
      </label>
      <p className="text-muted text-xs">
        Links do Instagram, um por linha, máximo de 10. Ficam relacionados também à memória do
        acontecimento.
      </p>
      <ActionSubmit label="Salvar links externos" />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

function ActionSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border-border rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
    >
      {pending ? 'Salvando…' : label}
    </button>
  );
}

function useSavedEditor(
  action: (state: ContentActionState, data: FormData) => Promise<ContentActionState>,
) {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return {
    dirty,
    setDirty,
    action: async (state: ContentActionState, data: FormData) => {
      const result = await action(state, data);
      if (!result.error) setDirty(false);
      return result;
    },
  };
}

function PublicationButton({
  eventId,
  kind,
  id,
  published,
  dirty,
}: {
  eventId: string;
  kind: 'news' | 'announcement';
  id: string;
  published: boolean;
  dirty: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ContentActionState>({ error: null });
  return (
    <div className="border-border mt-4 border-t pt-4">
      <p className="text-muted mb-2 text-sm">
        Situação: {published ? 'Publicado no Portal' : 'Rascunho'}
      </p>
      <button
        type="button"
        disabled={pending || dirty}
        className="bg-primary rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
        onClick={() =>
          start(async () => {
            setMessage(await setWorkspacePublicationAction(eventId, kind, id, !published));
          })
        }
      >
        {pending ? 'Atualizando…' : published ? 'Retirar do Portal' : 'Publicar no Portal'}
      </button>
      {dirty && <p className="text-muted mt-2 text-xs">Salve as alterações antes de publicar.</p>}
      {(message.error || message.success) && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={`mt-2 text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {message.error ?? message.success}
        </p>
      )}
    </div>
  );
}

export function WorkspaceNewsEditor({
  event,
  news,
  canPublish,
  photos,
}: {
  event: NewsEventOption;
  news?: News;
  canPublish: boolean;
  photos: { id: string; url: string; label: string }[];
}) {
  const editor = useSavedEditor(
    news
      ? updateWorkspaceNewsAction.bind(null, event.id, news.id)
      : createWorkspaceNewsAction.bind(null, event.id),
  );
  return (
    <div
      onChange={() => editor.setDirty(true)}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('form button[type="button"]')) editor.setDirty(true);
      }}
    >
      <NewsForm action={editor.action} news={news} workspaceEvent={event} photos={photos} />
      {news && canPublish && (
        <PublicationButton
          eventId={event.id}
          kind="news"
          id={news.id}
          published={news.publicado}
          dirty={editor.dirty}
        />
      )}
    </div>
  );
}

export function WorkspaceAnnouncementEditor({
  eventId,
  title,
  announcement,
  canPublish,
}: {
  eventId: string;
  title: string;
  announcement?: Announcement;
  canPublish: boolean;
}) {
  const editor = useSavedEditor(
    announcement
      ? updateWorkspaceAnnouncementAction.bind(null, eventId, announcement.id)
      : createWorkspaceAnnouncementAction.bind(null, eventId),
  );
  return (
    <div onChange={() => editor.setDirty(true)}>
      <AnnouncementForm action={editor.action} announcement={announcement} initialTitle={title} />
      {announcement && canPublish && (
        <PublicationButton
          eventId={eventId}
          kind="announcement"
          id={announcement.id}
          published={announcement.publicado}
          dirty={editor.dirty}
        />
      )}
    </div>
  );
}

export function WorkspaceLinkForm({
  eventId,
  kind,
  options,
}: {
  eventId: string;
  kind: 'news' | 'announcement';
  options: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(linkWorkspaceContentAction.bind(null, eventId, kind), {
    error: null,
  });
  if (!options.length) return null;
  return (
    <form action={action} className="border-border mb-4 rounded-lg border p-4">
      <label className="text-sm font-medium">
        Vincular {kind === 'news' ? 'notícia' : 'aviso'} já cadastrado
        <select
          name="contentId"
          required
          defaultValue=""
          className="border-border bg-surface mt-2 w-full rounded-lg border p-2"
        >
          <option value="" disabled>
            Selecione um conteúdo sem vínculo
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </label>
      <LinkSubmit />
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

function LinkSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border-border mt-3 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
    >
      {pending ? 'Vinculando…' : 'Vincular ao acontecimento'}
    </button>
  );
}
