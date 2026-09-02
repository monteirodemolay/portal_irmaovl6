'use client';

import { useActionState, useState } from 'react';
import type { Event } from '@vl6/domain';
import {
  SESSION_ACCESS_KINDS,
  SESSION_ACCESS_LABELS,
  SESSION_NATURE_LABELS,
  SESSION_NATURES_BY_TYPE,
  SESSION_TYPE_LABELS,
  SESSION_TYPES,
  SESSION_WORK_DEGREE_LABELS,
  SESSION_WORK_DEGREES,
  type SessionType,
} from '@vl6/shared';
import { Button, Select } from '@vl6/ui';
import {
  reclassifySessionAction,
  type ReclassifySessionActionState,
} from '../actions/agenda-actions';

const INITIAL_STATE: ReclassifySessionActionState = { error: null };

/** Uma linha do painel de revisão em lote — classifica direto na lista, sem abrir a edição completa do Evento. */
export function SessionReviewRow({ event }: { event: Event }) {
  const action = reclassifySessionAction.bind(null, event.id);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [sessionType, setSessionType] = useState<SessionType | ''>('');

  return (
    <li className="border-border rounded-lg border bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold">{event.titulo}</p>
        <p className="text-muted text-xs">
          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(event.dataInicio)}
          {event.legacySessionType && (
            <>
              {' — '}
              <span className="italic">classificação antiga: {event.legacySessionType}</span>
            </>
          )}
        </p>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Tipo
          <Select
            name="sessionType"
            required
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
            className="h-9 w-40"
          >
            <option value="" disabled>
              Escolha…
            </option>
            {SESSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {SESSION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          Natureza
          <Select
            name="sessionNature"
            required
            disabled={!sessionType}
            defaultValue=""
            className="h-9 w-48"
          >
            <option value="" disabled>
              Escolha…
            </option>
            {(sessionType ? SESSION_NATURES_BY_TYPE[sessionType] : []).map((nature) => (
              <option key={nature} value={nature}>
                {SESSION_NATURE_LABELS[nature] ?? nature}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          Grau dos trabalhos
          <Select name="degreeWork" defaultValue="" className="h-9 w-44">
            <option value="">—</option>
            {SESSION_WORK_DEGREES.map((degree) => (
              <option key={degree} value={degree}>
                {SESSION_WORK_DEGREE_LABELS[degree]}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          Acesso
          <Select name="access" defaultValue="" className="h-9 w-44">
            <option value="">—</option>
            {SESSION_ACCESS_KINDS.map((access) => (
              <option key={access} value={access}>
                {SESSION_ACCESS_LABELS[access]}
              </option>
            ))}
          </Select>
        </label>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Salvando…' : 'Confirmar classificação'}
        </Button>
      </form>

      {state.error && <p className="text-destructive mt-2 text-xs">{state.error}</p>}
    </li>
  );
}
