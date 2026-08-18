'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { QuoteRotationMode } from '@vl6/shared';
import { Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  updateQuoteRotationAction,
  type QuoteRotationActionState,
} from '../actions/content-actions';

export interface QuoteRotationFormProps {
  modo: QuoteRotationMode;
  intervaloMinutos: number | null;
}

const initialState: QuoteRotationActionState = { error: null, success: false };

export function QuoteRotationForm({ modo, intervaloMinutos }: QuoteRotationFormProps) {
  const [state, formAction] = useActionState(updateQuoteRotationAction, initialState);
  const [selectedModo, setSelectedModo] = useState<QuoteRotationMode>(modo);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <FormField
        label="Quando a frase troca"
        htmlFor="modo"
        description="Controla a cadência da 'frase do dia' exibida no Início para todos os Irmãos."
      >
        <Select
          id="modo"
          name="modo"
          defaultValue={modo}
          onChange={(e) => setSelectedModo(e.target.value as QuoteRotationMode)}
        >
          <option value="recarga">A cada recarga da página</option>
          <option value="diaria">Uma vez por dia</option>
          <option value="intervalo">De tempos em tempos</option>
        </Select>
      </FormField>
      {selectedModo === 'intervalo' && (
        <FormField
          label="Intervalo (em minutos)"
          htmlFor="intervaloMinutos"
          description="Ex.: 60 = troca a cada hora. Mínimo 5, máximo 10080 (uma semana)."
        >
          <Input
            id="intervaloMinutos"
            name="intervaloMinutos"
            type="number"
            min={5}
            max={10080}
            required
            defaultValue={intervaloMinutos ?? 60}
          />
        </FormField>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-accent text-sm">Preferência salva.</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar preferência'}
    </Button>
  );
}
