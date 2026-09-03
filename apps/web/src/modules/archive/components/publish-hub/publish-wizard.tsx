'use client';

import { useState } from 'react';
import type { ArchiveEventPublishState, ArchiveItem, BoardTerm, Event } from '@vl6/domain';
import { ClassifyStep } from './classify-step';
import { EventStep } from './event-step';
import { OrganizeStep } from './organize-step';
import { PublishStep } from './publish-step';
import { ReviewSummaryStep } from './review-summary-step';
import { UploadStep } from './upload-step';
import { useArchiveItemWorkspace } from './use-archive-item-workspace';
import { WizardStepper, type PublishWizardStep } from './wizard-chrome';

export interface PublishWizardProps {
  events: Event[];
  drafts: ArchiveItem[];
  boardTerms: BoardTerm[];
  eventPublishState: Record<string, ArchiveEventPublishState>;
}

/**
 * Wizard de 6 passos da Central de Publicação — Evento → Arquivos →
 * Classificação → Organização → Revisão → Publicação
 * (docs/architecture/11-acervo-vl6.md §11.5/§11.6), redesenhado a partir
 * do mock-up aprovado pelo Administrador. Nenhuma regra de negócio nova:
 * "Classificação" reaproveita `updateArchiveMediaBatchAction`;
 * "Organização"/"Revisão"/"Publicação" são o antigo `ReviewStep`
 * monolítico dividido em telas, todos operando sobre o mesmo
 * `useArchiveItemWorkspace` pra não recarregar dados ao trocar de passo.
 *
 * Estado do lote (evento selecionado, `archiveItemId` em uso) vive
 * client-side, em memória — nada de sessão de upload persistida no
 * servidor ainda (decisão explícita do escopo da Fase 2). O rascunho em si
 * já fica persistido a cada arquivo enviado (`ArchiveItem.publicacaoStatus
 * === 'rascunho'`), então recarregar a página não perde os dados — só o
 * progresso da navegação entre passos.
 */
export function PublishWizard({
  events,
  drafts,
  boardTerms,
  eventPublishState,
}: PublishWizardProps) {
  const [step, setStep] = useState<PublishWizardStep>('evento');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);

  function handleEventSelected(event: Event, existingArchiveItemId: string | null) {
    setSelectedEvent(event);
    setArchiveItemId(existingArchiveItemId);
    setStep('arquivos');
  }

  function handleResumeDraft(draft: ArchiveItem) {
    const event = events.find((candidate) => candidate.id === draft.eventId) ?? null;
    setSelectedEvent(event);
    setArchiveItemId(draft.id);
    setStep('arquivos');
  }

  function handleNavigate(target: PublishWizardStep) {
    // Só permite voltar (ou ficar no atual) — avançar exige concluir o
    // passo corrente, mesma regra do wizard antigo (3 passos).
    const order: PublishWizardStep[] = [
      'evento',
      'arquivos',
      'classificacao',
      'organizacao',
      'revisao',
      'publicacao',
    ];
    if (order.indexOf(target) <= order.indexOf(step)) setStep(target);
  }

  return (
    <div className="flex flex-col gap-5">
      <WizardStepper current={step} onNavigate={handleNavigate} />

      {step === 'evento' && (
        <EventStep
          events={events}
          drafts={drafts}
          boardTerms={boardTerms}
          eventPublishState={eventPublishState}
          onEventSelected={handleEventSelected}
          onResumeDraft={handleResumeDraft}
        />
      )}

      {step === 'arquivos' && selectedEvent && (
        <UploadStep
          event={selectedEvent}
          initialArchiveItemId={archiveItemId}
          onBack={() => setStep('evento')}
          onContinue={(itemId) => {
            setArchiveItemId(itemId);
            setStep('classificacao');
          }}
        />
      )}

      {step === 'classificacao' && selectedEvent && archiveItemId && (
        <ClassifyStep
          archiveItemId={archiveItemId}
          eventTitle={selectedEvent.titulo}
          eventDate={selectedEvent.dataInicio}
          eventLocal={selectedEvent.local}
          onBack={() => setStep('arquivos')}
          onContinue={() => setStep('organizacao')}
        />
      )}

      {(step === 'organizacao' || step === 'revisao' || step === 'publicacao') &&
        selectedEvent &&
        archiveItemId && (
          <WorkspaceSteps
            archiveItemId={archiveItemId}
            event={selectedEvent}
            activeSubStep={step}
            onBackToClassify={() => setStep('classificacao')}
            onContinueToReview={() => setStep('revisao')}
            onBackToOrganize={() => setStep('organizacao')}
            onContinueToPublish={() => setStep('publicacao')}
            onBackToReview={() => setStep('revisao')}
            onDone={() => {
              setSelectedEvent(null);
              setArchiveItemId(null);
              setStep('evento');
            }}
          />
        )}
    </div>
  );
}

/**
 * Os passos "Organização"/"Revisão"/"Publicação" compartilham o mesmo
 * `useArchiveItemWorkspace` — por isso vivem sob um único componente que
 * monta o hook uma vez e só troca qual sub-tela renderizar, em vez de cada
 * `step === X` do wizard remontar o workspace do zero (perderia o cache de
 * `summary`/`checklist` ao ir e voltar entre esses três passos).
 */
function WorkspaceSteps({
  archiveItemId,
  event,
  activeSubStep,
  onBackToClassify,
  onContinueToReview,
  onBackToOrganize,
  onContinueToPublish,
  onBackToReview,
  onDone,
}: {
  archiveItemId: string;
  event: Event;
  activeSubStep: 'organizacao' | 'revisao' | 'publicacao';
  onBackToClassify: () => void;
  onContinueToReview: () => void;
  onBackToOrganize: () => void;
  onContinueToPublish: () => void;
  onBackToReview: () => void;
  onDone: () => void;
}) {
  const workspace = useArchiveItemWorkspace(archiveItemId);

  if (activeSubStep === 'organizacao') {
    return (
      <OrganizeStep
        workspace={workspace}
        eventTitle={event.titulo}
        eventDate={event.dataInicio}
        eventLocal={event.local}
        onBack={onBackToClassify}
        onContinue={onContinueToReview}
      />
    );
  }

  if (activeSubStep === 'revisao') {
    return (
      <ReviewSummaryStep
        workspace={workspace}
        eventId={event.id}
        eventTitle={event.titulo}
        eventDate={event.dataInicio}
        eventLocal={event.local}
        onBack={onBackToOrganize}
        onContinue={onContinueToPublish}
      />
    );
  }

  return (
    <PublishStep
      workspace={workspace}
      eventTitle={event.titulo}
      eventDate={event.dataInicio}
      eventLocal={event.local}
      onBack={onBackToReview}
      onDone={onDone}
    />
  );
}
