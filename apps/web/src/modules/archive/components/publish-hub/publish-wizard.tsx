'use client';

import { useState } from 'react';
import type { ArchiveItem, BoardTerm, Event } from '@vl6/domain';
import { cn } from '@vl6/ui';
import { EventStep } from './event-step';
import { UploadStep } from './upload-step';
import { ReviewStep } from './review-step';

export type PublishWizardStep = 'evento' | 'enviar' | 'organizar';

const STEPS: { key: PublishWizardStep; label: string }[] = [
  { key: 'evento', label: 'Evento' },
  { key: 'enviar', label: 'Enviar' },
  { key: 'organizar', label: 'Organizar / Publicar' },
];

function WizardStepper({ current }: { current: PublishWizardStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const isActive = step.key === current;
        const isDone = index < currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted">→</span>}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium',
                isActive && 'bg-primary text-white',
                isDone && !isActive && 'bg-accent/20 text-primary-dark',
                !isActive && !isDone && 'text-muted bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  isActive ? 'bg-white/20' : 'bg-primary/10',
                )}
              >
                {index + 1}
              </span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export interface PublishWizardProps {
  events: Event[];
  drafts: ArchiveItem[];
  boardTerms: BoardTerm[];
}

/**
 * Wizard de 4 passos da Central de Publicação — Evento → Enviar → Organizar
 * → Publicar (docs/architecture/11-acervo-vl6.md §11.5/§11.6). Os passos 1
 * e 2 são o coração funcional da Fase 2; "Organizar/Publicar" (junto aqui
 * no mesmo componente, `ReviewStep`) é um esqueleto de resumo — sem
 * drag-reorder, capa ou checklist, aprofundado na Fase 3.
 *
 * Estado do lote (evento selecionado, `archiveItemId` em uso) vive
 * client-side, em memória — nada de sessão de upload persistida no
 * servidor ainda (decisão explícita do escopo da Fase 2). O rascunho em si
 * já fica persistido a cada arquivo enviado (`ArchiveItem.publicacaoStatus
 * === 'rascunho'`), então recarregar a página não perde os dados — só o
 * progresso da navegação entre passos.
 */
export function PublishWizard({ events, drafts, boardTerms }: PublishWizardProps) {
  const [step, setStep] = useState<PublishWizardStep>('evento');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);

  function handleEventSelected(event: Event, existingArchiveItemId: string | null) {
    setSelectedEvent(event);
    setArchiveItemId(existingArchiveItemId);
    setStep('enviar');
  }

  function handleResumeDraft(draft: ArchiveItem) {
    const event = events.find((candidate) => candidate.id === draft.eventId) ?? null;
    setSelectedEvent(event);
    setArchiveItemId(draft.id);
    setStep('enviar');
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardStepper current={step} />

      {step === 'evento' && (
        <EventStep
          events={events}
          drafts={drafts}
          boardTerms={boardTerms}
          onEventSelected={handleEventSelected}
          onResumeDraft={handleResumeDraft}
        />
      )}

      {step === 'enviar' && selectedEvent && (
        <UploadStep
          event={selectedEvent}
          initialArchiveItemId={archiveItemId}
          onBack={() => setStep('evento')}
          onContinue={(itemId) => {
            setArchiveItemId(itemId);
            setStep('organizar');
          }}
        />
      )}

      {step === 'organizar' && archiveItemId && (
        <ReviewStep archiveItemId={archiveItemId} onBack={() => setStep('enviar')} />
      )}
    </div>
  );
}
