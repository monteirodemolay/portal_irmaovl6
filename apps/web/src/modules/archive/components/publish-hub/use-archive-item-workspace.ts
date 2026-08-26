import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  cancelScheduledArchiveItemPublicationAction,
  loadArchiveItemSummaryAction,
  loadMemberPickerOptionsAction,
  loadPublicationChecklistAction,
  publishArchiveItemAction,
  reorderArchiveMediaAction,
  scheduleArchiveItemPublicationAction,
  setArchiveItemCoverAction,
  softDeleteArchiveMediaAction,
  updateArchiveMediaFieldsAction,
  type ArchiveItemSummary,
  type ArchiveItemSummaryMedia,
  type MemberPickerOption,
  type PublicationChecklistResult,
} from '../../actions/publish-hub-actions';

/**
 * Estado e mutações compartilhados pelos passos "Organização", "Revisão" e
 * "Publicação" — os três operam sobre o mesmo `ArchiveItem` carregado uma
 * única vez aqui (`summary`/`checklist`/`memberOptions`), em vez de cada
 * passo refazer sua própria busca ao trocar de tela. Extraído do antigo
 * `ReviewStep` monolítico (Fase 3) sem alterar nenhuma regra de negócio —
 * só separa dado e mutação (aqui) de apresentação (cada step).
 */
export function useArchiveItemWorkspace(archiveItemId: string) {
  const [summary, setSummary] = useState<ArchiveItemSummary | null>(null);
  const [checklist, setChecklist] = useState<PublicationChecklistResult | null>(null);
  const [memberOptions, setMemberOptions] = useState<MemberPickerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPublishing, startPublishing] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState('');
  const [isScheduling, startScheduling] = useTransition();

  const refresh = useCallback(async () => {
    const [nextSummary, nextChecklist] = await Promise.all([
      loadArchiveItemSummaryAction(archiveItemId),
      loadPublicationChecklistAction(archiveItemId),
    ]);
    setSummary(nextSummary);
    setChecklist(nextChecklist);
  }, [archiveItemId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([refresh(), loadMemberPickerOptionsAction().then(setMemberOptions)]).finally(() =>
      setIsLoading(false),
    );
  }, [refresh]);

  function byType(type: ArchiveItemSummaryMedia['mediaType']) {
    return summary?.medias.filter((m) => m.mediaType === type) ?? [];
  }

  async function updateField(
    media: ArchiveItemSummaryMedia,
    fields: Parameters<typeof updateArchiveMediaFieldsAction>[2],
  ) {
    const result = await updateArchiveMediaFieldsAction(archiveItemId, media.id, fields);
    if (!result.ok) {
      setMessage({ text: result.error ?? 'Não foi possível salvar.', error: true });
      return;
    }
    await refresh();
  }

  async function handleSetCover(media: ArchiveItemSummaryMedia) {
    const result = await setArchiveItemCoverAction(archiveItemId, media.id);
    if (!result.ok) {
      setMessage({ text: result.error ?? 'Não foi possível definir a capa.', error: true });
      return;
    }
    await refresh();
  }

  async function handleDelete(media: ArchiveItemSummaryMedia) {
    const result = await softDeleteArchiveMediaAction(media.id);
    if (!result.ok) {
      setMessage({ text: result.error ?? 'Não foi possível excluir.', error: true });
      return;
    }
    await refresh();
  }

  async function handleDrop(targetId: string) {
    if (!summary || !dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const currentSummary = summary;
    const fotos = byType('foto');
    const ids = fotos.map((m) => m.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragId(null);
      return;
    }
    const reordered = ids.slice();
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);
    setDragId(null);
    const result = await reorderArchiveMediaAction(archiveItemId, [
      ...reordered,
      ...currentSummary.medias.filter((m) => m.mediaType !== 'foto').map((m) => m.id),
    ]);
    if (!result.ok) {
      setMessage({ text: result.error ?? 'Não foi possível reordenar.', error: true });
      return;
    }
    await refresh();
  }

  function handlePublish() {
    setMessage(null);
    startPublishing(async () => {
      const result = await publishArchiveItemAction(archiveItemId);
      if (!result.ok) {
        setMessage({ text: result.error ?? 'Não foi possível publicar.', error: true });
        return;
      }
      setMessage({ text: 'Evento publicado com sucesso.', error: false });
      await refresh();
    });
  }

  function handleSchedule() {
    if (!scheduleValue) return;
    setMessage(null);
    startScheduling(async () => {
      const result = await scheduleArchiveItemPublicationAction(archiveItemId, scheduleValue);
      if (!result.ok) {
        setMessage({ text: result.error ?? 'Não foi possível agendar.', error: true });
        return;
      }
      setMessage({ text: 'Publicação agendada com sucesso.', error: false });
      setScheduleValue('');
      await refresh();
    });
  }

  function handleCancelSchedule() {
    setMessage(null);
    startScheduling(async () => {
      const result = await cancelScheduledArchiveItemPublicationAction(archiveItemId);
      if (!result.ok) {
        setMessage({
          text: result.error ?? 'Não foi possível cancelar o agendamento.',
          error: true,
        });
        return;
      }
      setMessage({ text: 'Agendamento cancelado.', error: false });
      await refresh();
    });
  }

  return {
    summary,
    checklist,
    memberOptions,
    isLoading,
    message,
    setMessage,
    byType,
    updateField,
    handleSetCover,
    handleDelete,
    dragId,
    setDragId,
    handleDrop,
    handlePublish,
    isPublishing,
    handleSchedule,
    handleCancelSchedule,
    isScheduling,
    scheduleValue,
    setScheduleValue,
    refresh,
  };
}

export type ArchiveItemWorkspace = ReturnType<typeof useArchiveItemWorkspace>;
