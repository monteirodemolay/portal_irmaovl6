'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { PhilosophicalJourney } from '@vl6/domain';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, X } from '@vl6/ui';
import {
  registerPhilosophicalJourneyAction,
  removePhilosophicalJourneyAction,
  type PhilosophicalJourneyActionState,
} from '../actions/honor-actions';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : 'data não registrada';
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando…' : 'Adicionar registro'}
    </Button>
  );
}

/**
 * "Graus Filosóficos e Corpos Maçônicos" — levantamento §4 (Rito Escocês
 * Antigo e Aceito, Rito de York etc.). `visivel` fica desmarcado por
 * padrão: dado sensível/sigiloso, só aparece no Perfil público quando o
 * Administrador confirma que o Irmão autorizou a divulgação.
 */
export function PhilosophicalJourneyCard({
  memberId,
  journeys,
}: {
  memberId: string;
  journeys: PhilosophicalJourney[];
}) {
  const boundAction = registerPhilosophicalJourneyAction.bind(null, memberId);
  const [state, formAction] = useActionState<PhilosophicalJourneyActionState, FormData>(
    boundAction,
    { error: null },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Graus Filosóficos e Corpos Maçônicos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {journeys.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {journeys.map((journey) => (
              <li
                key={journey.id}
                className="border-border bg-background flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {journey.rito}
                    {journey.grau ? ` · ${journey.grau}` : ''}
                  </span>
                  <span className="text-muted text-xs">
                    {[journey.corpoMaconico, journey.instituicao].filter(Boolean).join(' · ')}
                    {journey.corpoMaconico || journey.instituicao ? ' · ' : ''}
                    {formatDate(journey.data)}
                    {' · '}
                    {journey.visivel ? 'visível no Perfil' : 'oculto do Perfil'}
                  </span>
                </div>
                <form action={removePhilosophicalJourneyAction.bind(null, journey.id, memberId)}>
                  <button
                    type="submit"
                    className="text-muted hover:text-destructive rounded-full p-0.5"
                    aria-label="Remover registro"
                  >
                    <X size={14} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Nenhum grau filosófico cadastrado ainda.</p>
        )}

        <form action={formAction} className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rito">Rito</Label>
              <Input id="rito" name="rito" placeholder="Ex.: Rito Escocês Antigo e Aceito" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grau">Grau (opcional)</Label>
              <Input id="grau" name="grau" placeholder="Ex.: Grau 18" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="corpoMaconico">Corpo maçônico (opcional)</Label>
              <Input
                id="corpoMaconico"
                name="corpoMaconico"
                placeholder="Ex.: Capítulo Rosa+Cruz"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instituicao">Instituição (opcional)</Label>
              <Input id="instituicao" name="instituicao" placeholder="Ex.: Supremo Conselho" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data">Data (opcional)</Label>
              <Input id="data" name="data" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="funcoesExercidas">Funções exercidas (opcional)</Label>
              <Input id="funcoesExercidas" name="funcoesExercidas" placeholder="Ex.: Venerável" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visivel" className="accent-primary h-4 w-4" />
            Exibir no Perfil público (o Irmão autorizou a divulgação)
          </label>

          {state.error && <p className="text-destructive text-sm">{state.error}</p>}

          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
