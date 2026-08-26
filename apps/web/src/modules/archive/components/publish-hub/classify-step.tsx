'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ArchiveMediaCounts } from '@vl6/domain';
import type { ArchiveMediaTypeKey } from '@vl6/shared';
import { Button } from '@vl6/ui';
import {
  loadArchiveItemSummaryAction,
  updateArchiveMediaBatchAction,
  type ArchiveItemSummaryMedia,
} from '../../actions/publish-hub-actions';
import { BatchMetadataPanel } from './batch-metadata-panel';
import { EventContextBar, MediaStatsRow, StepTitle } from './wizard-chrome';

export interface ClassifyStepProps {
  archiveItemId: string;
  eventTitle: string;
  eventDate: Date;
  eventLocal: string;
  onBack: () => void;
  onContinue: () => void;
}

const TYPE_LABELS: Record<ArchiveMediaTypeKey, string> = {
  foto: 'Fotografias',
  video: 'Vídeos',
  audio: 'Áudios',
  documento: 'Documentos',
};

const TYPE_SUGGESTIONS: Record<ArchiveMediaTypeKey, string[]> = {
  foto: ['Registro geral do evento', 'Cerimônia', 'Outro'],
  video: ['Registro completo', 'Trecho da cerimônia', 'Homenagem', 'Discurso', 'Outro'],
  audio: ['Discurso', 'Entrevista', 'Trilha institucional', 'Outro'],
  documento: ['Ata', 'Convite', 'Edital', 'Programa', 'Boletim', 'Certificado', 'Outro'],
};

/**
 * Passo 3 do wizard — "Classificação". Não é lógica nova: reaproveita
 * `updateArchiveMediaBatchAction` (já usado pelo antigo painel de
 * metadados em lote), só que aplicado por tipo de mídia — cada card sugere
 * um valor padrão de `role`/`documentType` pro tipo inteiro, com a opção
 * de "aplicar a todos os itens" já marcada (mesmo comportamento do
 * mock-up aprovado). O Administrador ainda pode refinar item a item nos
 * passos seguintes (Organização/Revisão) — isto aqui só evita repetir a
 * mesma classificação em cada arquivo um por um.
 */
export function ClassifyStep({
  archiveItemId,
  eventTitle,
  eventDate,
  eventLocal,
  onBack,
  onContinue,
}: ClassifyStepProps) {
  const [medias, setMedias] = useState<ArchiveItemSummaryMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selections, setSelections] = useState<Record<ArchiveMediaTypeKey, string>>({
    foto: TYPE_SUGGESTIONS.foto[0]!,
    video: TYPE_SUGGESTIONS.video[0]!,
    audio: TYPE_SUGGESTIONS.audio[0]!,
    documento: TYPE_SUGGESTIONS.documento[0]!,
  });
  const [applyToAll, setApplyToAll] = useState<Record<ArchiveMediaTypeKey, boolean>>({
    foto: true,
    video: true,
    audio: true,
    documento: true,
  });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadArchiveItemSummaryAction(archiveItemId).then((summary) => {
      if (cancelled || !summary) return;
      setMedias(summary.medias);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [archiveItemId]);

  const counts: ArchiveMediaCounts = medias.reduce<ArchiveMediaCounts>(
    (acc, media) => {
      acc[media.mediaType] += 1;
      return acc;
    },
    { foto: 0, video: 0, audio: 0, documento: 0 },
  );

  const byType = (type: ArchiveMediaTypeKey) => medias.filter((m) => m.mediaType === type);

  function handleApplyType(type: ArchiveMediaTypeKey) {
    if (!applyToAll[type]) return;
    const ids = byType(type).map((m) => m.id);
    if (ids.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const value = selections[type];
      const fields = type === 'documento' ? { documentType: value } : { role: value };
      const result = await updateArchiveMediaBatchAction(archiveItemId, ids, fields);
      if (!result.ok) {
        setMessage({ text: result.error ?? 'Não foi possível classificar.', error: true });
        return;
      }
      setMessage({ text: `Classificação aplicada a ${ids.length} arquivo(s).`, error: false });
    });
  }

  const allTargetIds = medias.map((m) => m.id);

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
          n={3}
          title="Revise a classificação automática"
          text="O sistema separou o lote por tipo. Ajuste apenas o que for necessário."
        />

        {isLoading ? (
          <p className="text-muted text-sm">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-5">
            <MediaStatsRow counts={counts} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(TYPE_LABELS) as ArchiveMediaTypeKey[])
                .filter((type) => counts[type] > 0)
                .map((type) => (
                  <div key={type} className="border-border rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <b>{TYPE_LABELS[type]}</b>
                      <span className="bg-bg rounded-full px-2 py-0.5 text-xs">
                        {counts[type]} {counts[type] === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <p className="text-muted mt-2 text-xs">Classificação sugerida</p>
                    <select
                      value={selections[type]}
                      onChange={(event) =>
                        setSelections((prev) => ({ ...prev, [type]: event.target.value }))
                      }
                      onBlur={() => handleApplyType(type)}
                      className="border-border mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    >
                      {TYPE_SUGGESTIONS[type].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <label className="mt-2 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={applyToAll[type]}
                        onChange={(event) => {
                          setApplyToAll((prev) => ({ ...prev, [type]: event.target.checked }));
                        }}
                      />
                      Aplicar a todos os itens
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                      disabled={isPending || !applyToAll[type]}
                      onClick={() => handleApplyType(type)}
                    >
                      {isPending ? 'Aplicando…' : 'Aplicar a este tipo'}
                    </Button>
                  </div>
                ))}
            </div>

            <div className="border-accent/30 bg-accent/10 flex gap-3 rounded-lg border p-3">
              <span aria-hidden>✦</span>
              <div>
                <strong className="text-sm">Metadados herdados automaticamente</strong>
                <p className="text-muted text-xs">
                  Evento, Gestão, data, local e acesso inicial já foram associados a todos os
                  arquivos.
                </p>
              </div>
            </div>

            <BatchMetadataPanel
              archiveItemId={archiveItemId}
              targetArchiveMediaIds={allTargetIds}
              onApplied={() => {}}
            />

            {message && (
              <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
                {message.text}
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <Button type="button" onClick={onContinue}>
            Continuar →
          </Button>
        </div>
      </div>
    </>
  );
}
