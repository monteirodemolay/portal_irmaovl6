'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Event } from '@vl6/domain';
import { EVENT_KIND_LABELS, EVENT_KINDS } from '@vl6/shared';
import { Badge, Button, Card, CardContent, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createEventForPublishAction,
  previewBoardTermForDateAction,
  type BoardTermPreview,
  type CreateEventForPublishState,
} from '../../actions/publish-hub-actions';

const EMPTY_STATE: CreateEventForPublishState = { error: null, event: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Cadastrando…' : 'Cadastrar e continuar'}
    </Button>
  );
}

/**
 * Cadastro retroativo inline do passo 1 — mostra a Gestão identificada
 * pela data ANTES de salvar (`previewBoardTermForDateAction`, sem
 * persistir), disparado a cada mudança de data.
 */
export function CreateEventInlineForm({ onCreated }: { onCreated: (event: Event) => void }) {
  const [state, formAction] = useActionState(
    async (_prevState: CreateEventForPublishState, formData: FormData) => {
      const result = await createEventForPublishAction(_prevState, formData);
      if (result.event) onCreated(result.event);
      return result;
    },
    EMPTY_STATE,
  );
  const [boardTermPreview, setBoardTermPreview] = useState<BoardTermPreview | null>(null);
  const [boardTermChecked, setBoardTermChecked] = useState(false);

  async function handleDateChange(value: string) {
    if (!value) {
      setBoardTermChecked(false);
      setBoardTermPreview(null);
      return;
    }
    const preview = await previewBoardTermForDateAction(value);
    setBoardTermPreview(preview);
    setBoardTermChecked(true);
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Título" htmlFor="titulo">
              <Input id="titulo" name="titulo" required maxLength={200} />
            </FormField>
            <FormField
              label="Tipo"
              htmlFor="tipo"
              description="Pra Sessão, cadastre pela Agenda (com a classificação completa) e depois volte aqui pra selecioná-la."
            >
              {/* Sem "Sessão" de propósito — `eventSchema` exige sessionType/
                  sessionNature/degreeWork/access quando `tipo === 'sessao'`
                  (docs/architecture, Classificação de Sessões), e este
                  formulário rápido nunca coletou esses campos. Deixado
                  disponível, toda submissão com Tipo "Sessão" falhava a
                  validação — nenhum Evento chegava a ser criado, sem
                  nenhuma pista clara do motivo pro Administrador. */}
              <Select id="tipo" name="tipo" defaultValue="evento" required>
                {EVENT_KINDS.filter((kind) => kind !== 'sessao' && kind !== 'aniversario').map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {EVENT_KIND_LABELS[kind]}
                    </option>
                  ),
                )}
              </Select>
            </FormField>
            <FormField label="Local" htmlFor="local">
              <Input id="local" name="local" required maxLength={200} />
            </FormField>
            <FormField
              label="Data e hora"
              htmlFor="dataInicio"
              description={
                boardTermChecked
                  ? boardTermPreview
                    ? undefined
                    : 'Nenhuma Gestão cadastrada cobre esta data — o evento ainda pode ser criado.'
                  : 'A Gestão vigente é identificada automaticamente ao informar a data.'
              }
            >
              <Input
                id="dataInicio"
                name="dataInicio"
                type="datetime-local"
                required
                onChange={(event) => handleDateChange(event.target.value)}
              />
            </FormField>
          </div>
          {boardTermChecked && boardTermPreview && (
            <p className="text-sm">
              Gestão identificada: <Badge variant="accent">{boardTermPreview.nome}</Badge>
            </p>
          )}
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
