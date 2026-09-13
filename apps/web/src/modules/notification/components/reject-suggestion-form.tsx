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
  Label,
  Textarea,
} from '@vl6/ui';
import {
  rejectLinkSuggestionAction,
  type RejectLinkSuggestionState,
} from '../actions/link-admin-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Rejeitando…' : 'Rejeitar sugestão'}
    </Button>
  );
}

export function RejectSuggestionForm({ suggestionId }: { suggestionId: string }) {
  const boundAction = rejectLinkSuggestionAction.bind(null, suggestionId);
  const [state, formAction] = useActionState<RejectLinkSuggestionState, FormData>(boundAction, {
    error: null,
    success: false,
  });
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Rejeitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar sugestão</DialogTitle>
        </DialogHeader>
        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">Sugestão rejeitada.</p>
            <Button type="button" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`motivo-${suggestionId}`}>Motivo</Label>
              <Textarea id={`motivo-${suggestionId}`} name="motivo" rows={3} required />
            </div>
            {state.error && <p className="text-destructive text-sm">{state.error}</p>}
            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
