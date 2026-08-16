'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  ARCHIVE_CONTRIBUTION_TYPE_KEYS,
  ARCHIVE_CONTRIBUTION_TYPE_LABELS,
  type ArchiveContributionTypeKey,
} from '@vl6/shared';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  submitArchiveContributionAction,
  type ArchiveContributionActionState,
} from '../actions/archive-contribution-actions';

const EMPTY_STATE: ArchiveContributionActionState = { error: null, ok: false };

/**
 * Envolve o formulário num `key` que muda a cada envio bem-sucedido —
 * mesmo truque de reset do wizard de importação (`ImportMembersForm`):
 * remonta o formulário do zero em vez de tentar limpar campos
 * não-controlados um a um.
 */
export function ArchiveContributionForm() {
  const [attempt, setAttempt] = useState(0);
  return <ContributionFormAttempt key={attempt} onRestart={() => setAttempt((n) => n + 1)} />;
}

function ContributionFormAttempt({ onRestart }: { onRestart: () => void }) {
  const [state, formAction] = useActionState(submitArchiveContributionAction, EMPTY_STATE);
  const [tipo, setTipo] = useState<ArchiveContributionTypeKey>('documento');

  if (state.ok) {
    return (
      <div className="border-border bg-surface rounded-[16px] border p-6 text-center">
        <p className="font-display text-lg font-semibold">Contribuição enviada!</p>
        <p className="text-muted mt-1 text-sm">
          Um Administrador vai analisar o seu envio. Acompanhe o status na lista abaixo.
        </p>
        <Button className="mt-4" onClick={onRestart}>
          Enviar outra contribuição
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Tipo de contribuição" htmlFor="tipo">
        <Select
          id="tipo"
          name="tipo"
          required
          value={tipo}
          onChange={(event) => setTipo(event.target.value as ArchiveContributionTypeKey)}
        >
          {ARCHIVE_CONTRIBUTION_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {ARCHIVE_CONTRIBUTION_TYPE_LABELS[key]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required maxLength={200} />
      </FormField>
      <FormField
        label={tipo === 'memoria' ? 'Seu relato' : 'Descrição'}
        htmlFor="descricao"
        description={
          tipo === 'memoria'
            ? 'Conte a história ou memória que você quer compartilhar.'
            : 'Conte o que é este documento ou foto e o contexto que você conhece.'
        }
      >
        <Textarea id="descricao" name="descricao" required rows={5} maxLength={4000} />
      </FormField>
      {tipo !== 'memoria' && (
        <FormField
          label="Arquivo"
          htmlFor="arquivo"
          description={
            tipo === 'documento'
              ? 'PDF, Word ou foto do documento — até 10 MB.'
              : 'Foto ou vídeo — até 10 MB.'
          }
        >
          <input
            id="arquivo"
            name="arquivo"
            type="file"
            required
            className="border-border bg-surface w-full rounded border px-3 py-2 text-sm"
          />
        </FormField>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Enviando…' : 'Enviar contribuição'}
    </Button>
  );
}
