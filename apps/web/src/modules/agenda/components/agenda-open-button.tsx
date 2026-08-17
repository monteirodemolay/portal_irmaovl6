'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { useAgenda } from './agenda-provider';

export interface AgendaOpenButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  eventId?: string;
}

/**
 * Trigger reutilizável — abre o drawer da Agenda já posicionado num evento
 * (ou na visão geral, se `eventId` for omitido). Usado nos pontos de
 * entrada do Portal (card de próximo evento, lista da Agenda no Início,
 * item "Agenda" da sidebar) no lugar de um `<Link>` pra `/eventos/[id]`.
 * `forwardRef` + repasse de `...props` — compatível com `<Button asChild>`
 * (Radix `Slot`), que injeta `className`/`ref` no elemento filho único.
 */
export const AgendaOpenButton = forwardRef<HTMLButtonElement, AgendaOpenButtonProps>(
  function AgendaOpenButton({ eventId, onClick, ...props }, ref) {
    const { openAgenda } = useAgenda();

    return (
      <button
        ref={ref}
        type="button"
        onClick={(event) => {
          onClick?.(event);
          openAgenda(eventId);
        }}
        {...props}
      />
    );
  },
);
