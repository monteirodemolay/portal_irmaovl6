'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Send,
  Textarea,
} from '@vl6/ui';
import {
  submitLinkSuggestionAction,
  type LinkSuggestionActionState,
} from '../actions/link-actions';

const EMPTY_STATE: LinkSuggestionActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar sugestão'}
    </Button>
  );
}

/** "Sentiu falta de algum acesso?" — qualquer Irmão pode indicar um link pra um Administrador avaliar. */
export function SuggestLinkCard() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<LinkSuggestionActionState, FormData>(
    submitLinkSuggestionAction,
    EMPTY_STATE,
  );

  return (
    <aside className="from-primary to-primary-dark relative flex flex-col gap-4 rounded-2xl bg-gradient-to-r p-6 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-display text-lg font-semibold">Sentiu falta de algum acesso?</h3>
        <p className="mt-1 text-sm text-white/70">
          Indique um link para um Administrador avaliar a inclusão nesta página.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="shrink-0 border-white/40 text-white">
            <Send size={14} className="mr-1.5" />
            Sugerir um link
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugerir um link</DialogTitle>
          </DialogHeader>
          {state.success ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm">
                Sugestão enviada. Um Administrador vai avaliar a inclusão em breve.
              </p>
              <Button type="button" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="suggestion-titulo">Título</Label>
                <Input id="suggestion-titulo" name="titulo" required maxLength={150} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="suggestion-url">Link</Label>
                <Input id="suggestion-url" name="url" type="url" required placeholder="https://…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="suggestion-descricao">Por que esse acesso é útil? (opcional)</Label>
                <Textarea id="suggestion-descricao" name="descricao" rows={3} maxLength={500} />
              </div>
              {state.error && <p className="text-destructive text-sm">{state.error}</p>}
              <DialogFooter>
                <SubmitButton />
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  );
}
