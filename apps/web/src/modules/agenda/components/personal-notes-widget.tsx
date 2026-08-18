'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import type { PersonalNote } from '@vl6/domain';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Pin,
  StickyNote,
  Textarea,
  Trash2,
} from '@vl6/ui';
import {
  createPersonalNoteAction,
  deletePersonalNoteAction,
  togglePersonalNotePinAction,
  type PersonalNoteActionState,
} from '../actions/personal-note-actions';

const EMPTY_STATE: PersonalNoteActionState = { error: null };

export interface PersonalNotesWidgetProps {
  /** Só anotações avulsas (`eventoId === null`) — as vinculadas a um evento aparecem no painel de detalhes dele. */
  notes: PersonalNote[];
}

export function PersonalNotesWidget({ notes }: PersonalNotesWidgetProps) {
  const standaloneNotes = notes.filter((note) => note.eventoId === null);
  const [state, formAction] = useActionState<PersonalNoteActionState, FormData>(
    createPersonalNoteAction,
    EMPTY_STATE,
  );
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader className="space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote size={18} strokeWidth={1.75} />
          Minhas anotações
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form ref={formRef} action={formAction} className="flex flex-col gap-2">
          <Textarea
            name="texto"
            placeholder="Escreva uma anotação..."
            maxLength={2000}
            required
            rows={2}
          />
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>

        {standaloneNotes.length === 0 ? (
          <p className="text-muted text-sm">Nenhuma anotação por aqui ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {standaloneNotes.map((note) => (
              <li key={note.id} className="border-border group rounded border p-2.5">
                <p className="whitespace-pre-wrap text-sm">{note.texto}</p>
                <div className="mt-1.5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() => togglePersonalNotePinAction(note.id, !note.fixada))
                    }
                    className={
                      note.fixada
                        ? 'text-accent flex items-center gap-1 text-xs'
                        : 'text-muted hover:text-foreground flex items-center gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100'
                    }
                    aria-label={note.fixada ? 'Desafixar anotação' : 'Fixar anotação'}
                  >
                    <Pin
                      size={12}
                      strokeWidth={1.75}
                      fill={note.fixada ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => deletePersonalNoteAction(note.id))}
                    className="text-muted opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    aria-label="Excluir anotação"
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="w-fit">
      {pending ? 'Salvando...' : 'Adicionar'}
    </Button>
  );
}
