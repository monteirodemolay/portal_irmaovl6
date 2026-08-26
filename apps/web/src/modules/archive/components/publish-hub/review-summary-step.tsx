'use client';

import Link from 'next/link';
import { Button, EmptyState } from '@vl6/ui';
import { EventContextBar, StepTitle } from './wizard-chrome';
import type { ArchiveItemWorkspace } from './use-archive-item-workspace';

export interface ReviewSummaryStepProps {
  workspace: ArchiveItemWorkspace;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  eventLocal: string;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Passo 5 do wizard — "Revisão". Cartão de prévia (capa + estatísticas) ao
 * lado do checklist de publicação (`getArchiveItemPublicationBlockers` via
 * `loadPublicationChecklistAction` — nunca reimplementado aqui). O link
 * "Pré-visualizar como Irmão" abre a página pública real do Evento
 * (`/acervo/eventos/[eventId]`), não uma simulação.
 */
export function ReviewSummaryStep({
  workspace,
  eventId,
  eventTitle,
  eventDate,
  eventLocal,
  onBack,
  onContinue,
}: ReviewSummaryStepProps) {
  const { summary, checklist, isLoading, byType } = workspace;

  if (isLoading) return <p className="text-muted text-sm">Carregando…</p>;
  if (!summary) return <EmptyState title="Não foi possível carregar este item." />;

  const cover = summary.medias.find((m) => m.isCover) ?? byType('foto')[0] ?? null;

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
          n={5}
          title="Revise antes de publicar"
          text="Confira a página como ela será apresentada aos Irmãos."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="from-primary to-primary-dark relative flex h-44 items-center justify-center bg-gradient-to-br">
              {cover ? (
                <img
                  src={`/api/archive-media/${cover.id}`}
                  alt={cover.altText ?? summary.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-white/70">Sem capa definida</span>
              )}
            </div>
            <div className="p-4">
              <h2 className="font-display text-lg font-semibold">{summary.titulo}</h2>
              <p className="text-muted text-sm">
                Evento: {summary.eventoTitulo}
                {summary.gestaoNome ? ` · ${summary.gestaoNome}` : ' · Sem Gestão identificada'}
              </p>
              <div className="border-border mt-3 flex gap-6 border-t pt-3">
                {(['foto', 'video', 'audio', 'documento'] as const).map((type) => (
                  <div key={type} className="flex flex-col">
                    <b className="text-sm">{byType(type).length}</b>
                    <small className="text-muted text-[10px]">
                      {type === 'foto'
                        ? 'Fotografias'
                        : type === 'video'
                          ? 'Vídeos'
                          : type === 'audio'
                            ? 'Áudios'
                            : 'Documentos'}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-border flex flex-col gap-2 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Checklist de publicação</h3>
            {checklist && checklist.blockers.length === 0 ? (
              <p className="rounded bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
                ✓ Nenhuma pendência — pode publicar.
              </p>
            ) : (
              checklist?.blockers.map((blocker) => (
                <p key={blocker} className="rounded bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                  ! {blocker}
                </p>
              ))
            )}
            <Button asChild variant="outline" className="mt-2">
              <Link href={`/acervo/eventos/${eventId}`} target="_blank">
                Pré-visualizar como Irmão ↗
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <Button type="button" onClick={onContinue} disabled={!checklist?.canPublish}>
            Continuar →
          </Button>
          {!checklist?.canPublish && (
            <p className="text-muted mt-2 text-xs">
              Resolva as pendências do checklist para avançar pra publicação.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
