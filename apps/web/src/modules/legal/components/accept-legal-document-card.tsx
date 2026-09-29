'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@vl6/ui';
import type { LegalDocumentKey } from '@vl6/domain';
import { acceptLegalDocumentAction, type AcceptLegalDocumentState } from '../actions/legal-actions';

const EMPTY_STATE: AcceptLegalDocumentState = { error: null, ok: false };

/** Cartão de reaceite — aparece quando `pendente: true` em `LegalAcceptanceStatus`. */
export function AcceptLegalDocumentCard({
  documento,
  versao,
  diffResumo,
}: {
  documento: LegalDocumentKey;
  versao: string;
  diffResumo: string | null;
}) {
  const [state, formAction] = useActionState<AcceptLegalDocumentState, FormData>(
    acceptLegalDocumentAction,
    EMPTY_STATE,
  );
  const [checked, setChecked] = useState(false);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
        Aceite registrado para a versão {versao}. Obrigado por revisar.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="border-accent/40 bg-accent/5 flex flex-col gap-3 rounded-lg border border-dashed p-4"
    >
      <input type="hidden" name="documento" value={documento} />
      <input type="hidden" name="versao" value={versao} />

      <p className="text-sm font-medium">
        Há uma nova versão (v{versao}) que exige seu novo aceite.
      </p>
      {diffResumo && <p className="text-muted text-sm">{diffResumo}</p>}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        Li e estou ciente das alterações.
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton disabled={!checked} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="w-fit" disabled={pending || disabled}>
      {pending ? 'Registrando…' : 'Concordo e continuo'}
    </Button>
  );
}
