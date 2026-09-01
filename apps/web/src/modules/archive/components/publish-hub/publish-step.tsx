'use client';

import { useState, useTransition } from 'react';
import { Button, Check, Copy, EmptyState, Input, Instagram } from '@vl6/ui';
import { setArchiveItemInstagramLinkAction } from '../../actions/publish-hub-actions';
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

/**
 * Link do evento no Portal + registro do link do post no Instagram (puro
 * registro institucional, nunca publica nada na rede social) — pedido
 * explícito do Administrador: "onde foi publicado" precisa ficar
 * registrado nos dois lugares, Portal e Instagram, a partir da mesma tela
 * de conclusão da Central de Publicação.
 */
function PublishedLinksPanel({
  archiveItemId,
  eventId,
  initialInstagramUrl,
}: {
  archiveItemId: string;
  eventId: string;
  initialInstagramUrl: string | null;
}) {
  const portalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/acervo/eventos/${eventId}`
      : `/acervo/eventos/${eventId}`;
  const [copied, setCopied] = useState(false);
  const [instagramValue, setInstagramValue] = useState(initialInstagramUrl ?? '');
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSaveInstagram() {
    setError(null);
    setSaved(false);
    startSaving(async () => {
      const result = await setArchiveItemInstagramLinkAction(archiveItemId, instagramValue);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="mt-2 flex w-full max-w-md flex-col gap-3 text-left">
      <div className="border-border flex flex-col gap-1.5 rounded-lg border p-3">
        <span className="text-muted text-xs font-semibold">Link no Portal VL6</span>
        <div className="flex items-center gap-2">
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent min-w-0 flex-1 truncate text-xs hover:underline"
          >
            {portalUrl}
          </a>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      </div>

      <div className="border-border flex flex-col gap-1.5 rounded-lg border p-3">
        <span className="text-muted flex items-center gap-1.5 text-xs font-semibold">
          <Instagram size={13} />
          Link do post no Instagram (opcional)
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="url"
            placeholder="https://instagram.com/p/..."
            value={instagramValue}
            onChange={(event) => setInstagramValue(event.target.value)}
            className="text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveInstagram}
            disabled={isSaving}
          >
            {isSaving ? '…' : saved ? <Check size={14} /> : 'Salvar'}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-muted text-[11px]">
          Só um registro de onde esse mesmo conteúdo também foi divulgado — nada é postado
          automaticamente.
        </p>
      </div>
    </div>
  );
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

        <PublishedLinksPanel
          archiveItemId={summary.archiveItemId}
          eventId={summary.eventoId}
          initialInstagramUrl={summary.instagramUrl}
        />

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
