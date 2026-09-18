'use client';
import { useActionState } from 'react';
import type { Event } from '@vl6/domain';
import { Button, Card, CardContent, Select, Textarea } from '@vl6/ui';
import {
  reportLibraryOccurrenceAction,
  requestLibraryLoanAction,
  saveLibraryReviewAction,
  type LibraryActionState,
} from '../actions/library-actions';
export function LoanRequestForm({
  libraryItemId,
  events,
}: {
  libraryItemId: string;
  events: Event[];
}) {
  const [state, action] = useActionState<LibraryActionState, FormData>(requestLibraryLoanAction, {
    error: null,
  });
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <h3 className="font-semibold">Solicitar empréstimo</h3>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="libraryItemId" value={libraryItemId} />
          <Select name="pickupEventId" defaultValue="" required>
            <option value="" disabled>
              Sessão para retirada…
            </option>
            {events.map((e) => (
              <option value={e.id} key={e.id}>
                {e.titulo} · {e.dataInicio.toLocaleDateString('pt-BR')}
              </option>
            ))}
          </Select>
          <Button className="w-full sm:w-fit">Enviar ao Bibliotecário</Button>
        </form>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      </CardContent>
    </Card>
  );
}
export function ReviewForm({
  libraryItemId,
  defaultRating = 5,
  defaultComment,
}: {
  libraryItemId: string;
  defaultRating?: number;
  defaultComment?: string | null;
}) {
  const [state, action] = useActionState<LibraryActionState, FormData>(saveLibraryReviewAction, {
    error: null,
  });
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <h3 className="font-semibold">Sua avaliação</h3>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="libraryItemId" value={libraryItemId} />
          <Select name="rating" defaultValue={String(defaultRating)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrela(s)
              </option>
            ))}
          </Select>
          <Textarea
            name="comentario"
            defaultValue={defaultComment ?? ''}
            placeholder="Deixe sua opinião sobre a obra"
          />
          <Button className="w-full sm:w-fit">Publicar avaliação</Button>
        </form>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      </CardContent>
    </Card>
  );
}
export function OccurrenceReportForm({ loanId }: { loanId: string }) {
  const [state, action] = useActionState<LibraryActionState, FormData>(
    reportLibraryOccurrenceAction,
    { error: null },
  );
  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <h3 className="font-semibold">Reportar ocorrência</h3>
        <form action={action} className="grid gap-2">
          <input type="hidden" name="loanId" value={loanId} />
          <Select name="motivo">
            <option value="perda">Perda</option>
            <option value="roubo">Roubo</option>
            <option value="extravio">Extravio</option>
            <option value="dano_irrecuperavel">Dano irrecuperável</option>
            <option value="outro">Outro</option>
          </Select>
          <input className="h-10 rounded border px-3" type="date" name="occurredAt" required />
          <Textarea name="relato" minLength={20} required />
          <Button variant="destructive" className="w-full sm:w-fit">
            Enviar ao Bibliotecário
          </Button>
        </form>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}
      </CardContent>
    </Card>
  );
}
