'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Textarea } from '@vl6/ui';
import { createNewsCommentAction, type ContentActionState } from '../actions/content-actions';

export function NewsCommentForm({ newsId, slug }: { newsId: string; slug: string }) {
  const boundAction = createNewsCommentAction.bind(null, newsId, slug);
  const [state, formAction] = useActionState<ContentActionState, FormData>(boundAction, {
    error: null,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="texto"
        rows={3}
        required
        maxLength={1000}
        placeholder="Escreva um comentário… (fica visível após moderação)"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Enviando…' : 'Comentar'}
    </Button>
  );
}
