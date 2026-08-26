'use client';

import { Button, EmptyState, Input } from '@vl6/ui';
import { EventContextBar, StepTitle } from './wizard-chrome';
import type { ArchiveItemWorkspace } from './use-archive-item-workspace';

export interface PublishStepProps {
  workspace: ArchiveItemWorkspace;
  eventTitle: string;
  eventDate: Date;
  eventLocal: string;
  onBack: () => void;
  onDone: () => void;
}

function formatScheduledLabel(publicarEmIso: string): string {
  const date = new Date(publicarEmIso);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Passo 6 (final) do wizard — "Publicação". Publicar agora ou agendar
 * (`publishArchiveItemAction`/`scheduleArchiveItemPublicationAction`, Fase
 * B "Publicação avançada") — nenhuma regra nova, só a tela de conclusão
 * que o wizard antigo não tinha (ficava só num botão dentro da aba
 * "Visão geral").
 */
export function PublishStep({
  workspace,
  eventTitle,
  eventDate,
  eventLocal,
  onBack,
  onDone,
}: PublishStepProps) {
  const {
    summary,
    checklist,
    isLoading,
    byType,
    handlePublish,
    isPublishing,
    handleSchedule,
    handleCancelSchedule,
    isScheduling,
    scheduleValue,
    setScheduleValue,
    message,
  } = workspace;

  if (isLoading) return <p className="text-muted text-sm">Carregando…</p>;
  if (!summary) return <EmptyState title="Não foi possível carregar este item." />;

  const isPublished =
    summary.medias.length > 0 && summary.medias.every((m) => m.publicacaoStatus === 'publicado');
  const isScheduled = Boolean(summary.publicarEm && new Date(summary.publicarEm) > new Date());

  if (isPublished) {
    return (
      <div className="border-border bg-surface flex flex-col items-center gap-3 rounded-xl border p-10 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
          ✓
        </div>
        <h2 className="font-display text-xl font-semibold">Evento publicado com sucesso!</h2>
        <p className="text-muted max-w-md text-sm">
          <strong>{summary.titulo}</strong> agora faz parte da memória institucional da Verdadeira
          Luz.
        </p>
        <div className="mt-2 flex gap-2 text-xs">
          <span className="bg-bg rounded-full px-3 py-1.5">⌛ Linha do Tempo</span>
          {summary.gestaoNome && (
            <span className="bg-bg rounded-full px-3 py-1.5">♙ {summary.gestaoNome}</span>
          )}
          <span className="bg-bg rounded-full px-3 py-1.5">▦ Acervo VL6</span>
        </div>
        <Button type="button" variant="outline" onClick={onDone} className="mt-2">
          Publicar outro evento
        </Button>
      </div>
    );
  }

  return (
    <>
      <EventContextBar
        title={eventTitle}
        date={eventDate}
        local={eventLocal}
        onChangeEvent={onBack}
        changeLabel="← Voltar"
      />
      <div className="border-border bg-surface rounded-b-xl border border-t-0 p-6 shadow-sm">
        <StepTitle
          n={6}
          title="Tudo pronto para publicação"
          text="Escolha como o evento será disponibilizado no Portal."
        />

        <div className="border-border flex items-center gap-4 rounded-xl border p-4">
          <div className="from-primary to-primary-dark flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-2xl text-white">
            ▦
          </div>
          <div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              PRONTO PARA PUBLICAR
            </span>
            <h2 className="font-display mt-1 text-lg font-semibold">{summary.titulo}</h2>
            <div className="text-muted mt-1 flex gap-3 text-xs">
              <span>{byType('foto').length} fotografias</span>
              <span>{byType('video').length} vídeos</span>
              <span>{byType('documento').length} documentos</span>
              <span>{byType('audio').length} áudios</span>
            </div>
          </div>
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
            {message.text}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border-border flex flex-col gap-2 rounded-lg border p-4">
            <b className="text-sm">Publicar agora</b>
            <p className="text-muted text-xs">O evento ficará disponível imediatamente.</p>
            <Button
              type="button"
              className="mt-2"
              onClick={handlePublish}
              disabled={isPublishing || !checklist?.canPublish}
            >
              {isPublishing ? 'Publicando…' : 'Publicar evento ✓'}
            </Button>
          </div>

          <div className="border-border flex flex-col gap-2 rounded-lg border p-4">
            <b className="text-sm">Agendar publicação</b>
            <p className="text-muted text-xs">Defina uma data e horário para publicar.</p>
            {isScheduled ? (
              <div className="mt-1 flex flex-col gap-2">
                <p className="text-muted text-xs">
                  Agendado para{' '}
                  {summary.publicarEm ? formatScheduledLabel(summary.publicarEm) : '—'}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSchedule}
                  disabled={isScheduling}
                >
                  Cancelar agendamento
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex flex-col gap-2">
                <Input
                  type="datetime-local"
                  value={scheduleValue}
                  onChange={(event) => setScheduleValue(event.target.value)}
                  disabled={!checklist?.canPublish || isScheduling}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSchedule}
                  disabled={!checklist?.canPublish || isScheduling || !scheduleValue}
                >
                  {isScheduling ? 'Agendando…' : 'Agendar publicação'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-muted bg-bg mt-5 rounded-lg p-3 text-center text-xs">
          Ao publicar, o evento aparecerá no Acervo
          {summary.gestaoNome ? `, em ${summary.gestaoNome}` : ''} e na Linha do Tempo.
        </p>
      </div>
    </>
  );
}
