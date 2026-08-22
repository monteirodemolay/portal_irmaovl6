'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { ARCHIVE_MEDIA_TYPE_LABELS, type ArchiveMediaTypeKey } from '@vl6/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vl6/ui';
import {
  loadArchiveItemSummaryAction,
  loadPublicationChecklistAction,
  publishArchiveItemAction,
  reorderArchiveMediaAction,
  setArchiveItemCoverAction,
  softDeleteArchiveMediaAction,
  updateArchiveMediaFieldsAction,
  type ArchiveItemSummary,
  type ArchiveItemSummaryMedia,
  type PublicationChecklistResult,
} from '../../actions/publish-hub-actions';

export interface ReviewStepProps {
  archiveItemId: string;
  onBack: () => void;
}

const DOCUMENT_TYPE_OPTIONS = [
  'Ata',
  'Convite',
  'Edital',
  'Programa',
  'Boletim',
  'Certificado',
  'Documento administrativo',
  'Outro',
];

const VIDEO_ROLE_OPTIONS = [
  'Registro completo',
  'Trecho da cerimônia',
  'Homenagem',
  'Discurso',
  'Entrevista',
  'Retrospectiva',
  'Outro',
];

const AUDIO_ROLE_OPTIONS = ['Discurso', 'Entrevista', 'Trilha institucional', 'Outro'];

type ReviewTab = 'geral' | 'foto' | 'video' | 'audio' | 'documento' | 'pendencias';

const TABS: { key: ReviewTab; label: string }[] = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'foto', label: 'Fotografias' },
  { key: 'video', label: 'Vídeos' },
  { key: 'audio', label: 'Áudios' },
  { key: 'documento', label: 'Documentos' },
  { key: 'pendencias', label: 'Pendências' },
];

function mediaThumb(media: ArchiveItemSummaryMedia) {
  return `/api/archive-media/${media.id}`;
}

function pendingCaption(media: ArchiveItemSummaryMedia) {
  return !media.caption || media.caption.trim().length === 0;
}

/**
 * Passo "Organizar / Publicar" (Fase 3, docs/architecture/11-acervo-vl6.md
 * §11.6) — organização real por abas: reordenar fotografias (drag-and-drop
 * nativo), definir capa/destaques, classificar vídeos/documentos, lixeira
 * por mídia individual e o checklist que decide se o botão "Publicar
 * Evento" fica habilitado. O checklist nunca reimplementa a regra de
 * bloqueio — só exibe o que `loadPublicationChecklistAction` (que reusa
 * `getArchiveItemPublicationBlockers`, a mesma função que
 * `PublishArchiveItemUseCase` usa no servidor) já calculou.
 */
export function ReviewStep({ archiveItemId, onBack }: ReviewStepProps) {
  const [summary, setSummary] = useState<ArchiveItemSummary | null>(null);
  const [checklist, setChecklist] = useState<PublicationChecklistResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReviewTab>('geral');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPublishing, startPublishing] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

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
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  if (isLoading) {
    return <p className="text-muted text-sm">Carregando resumo…</p>;
  }

  if (!summary) {
    return <EmptyState title="Não foi possível carregar o resumo deste item." />;
  }

  const isPublished =
    summary.medias.length > 0 && summary.medias.every((m) => m.publicacaoStatus === 'publicado');

  const byType = (type: ArchiveMediaTypeKey) => summary.medias.filter((m) => m.mediaType === type);
  const countsByType = summary.medias.reduce<Record<ArchiveMediaTypeKey, number>>(
    (acc, media) => {
      acc[media.mediaType] = (acc[media.mediaType] ?? 0) + 1;
      return acc;
    },
    { foto: 0, video: 0, audio: 0, documento: 0 },
  );

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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-muted text-xs">Item do Acervo</p>
              <p className="font-display text-lg font-semibold">{summary.titulo}</p>
              <p className="text-muted text-sm">
                Evento: {summary.eventoTitulo}
                {summary.gestaoNome ? ` · ${summary.gestaoNome}` : ' · Sem Gestão identificada'}
              </p>
            </div>
            <Badge variant={isPublished ? 'success' : 'outline'}>
              {isPublished ? 'Publicado' : 'Rascunho'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(countsByType) as ArchiveMediaTypeKey[])
              .filter((type) => countsByType[type] > 0)
              .map((type) => (
                <Badge key={type} variant="accent">
                  {countsByType[type]} {ARCHIVE_MEDIA_TYPE_LABELS[type]}
                  {countsByType[type] > 1 ? 's' : ''}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReviewTab)}>
        <TabsList>
          {TABS.map((tab) => {
            const count =
              tab.key === 'pendencias'
                ? (checklist?.blockers.length ?? 0)
                : tab.key === 'geral'
                  ? summary.medias.length
                  : byType(tab.key as ArchiveMediaTypeKey).length;
            return (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label} <span className="text-muted">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="geral" className="pt-4">
          <div className="flex flex-col gap-2">
            {checklist && checklist.blockers.length === 0 && (
              <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Nenhuma pendência — pode publicar.
              </p>
            )}
            {checklist?.blockers.map((blocker) => (
              <p
                key={blocker}
                className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                {blocker}
              </p>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="foto" className="pt-4">
          {byType('foto').length === 0 ? (
            <EmptyState title="Nenhuma fotografia enviada." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {byType('foto').map((media) => (
                <div
                  key={media.id}
                  draggable
                  onDragStart={() => setDragId(media.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(media.id)}
                  className="border-border flex flex-col gap-2 rounded border p-2"
                >
                  <div className="relative">
                    <img
                      src={mediaThumb(media)}
                      alt={media.altText ?? media.originalName}
                      className="aspect-square w-full rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetCover(media)}
                      className={`absolute right-1 top-1 rounded px-2 py-0.5 text-xs font-medium ${
                        media.isCover ? 'bg-accent text-primary-dark' : 'bg-black/60 text-white'
                      }`}
                    >
                      {media.isCover ? '★ Capa' : '☆ Definir capa'}
                    </button>
                  </div>
                  <Input
                    defaultValue={media.caption ?? ''}
                    placeholder="Legenda…"
                    onBlur={(event) => updateField(media, { caption: event.target.value || null })}
                  />
                  <Button type="button" variant="outline" onClick={() => handleDelete(media)}>
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="pt-4">
          {byType('video').length === 0 ? (
            <EmptyState title="Nenhum vídeo enviado." />
          ) : (
            <div className="flex flex-col gap-2">
              {byType('video').map((media) => (
                <div
                  key={media.id}
                  className="border-border flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{media.originalName}</span>
                  <Select
                    defaultValue={media.role ?? ''}
                    onChange={(event) => updateField(media, { role: event.target.value || null })}
                  >
                    <option value="">Como aparece…</option>
                    {VIDEO_ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                  <Input
                    defaultValue={media.caption ?? ''}
                    placeholder="Legenda / descrição…"
                    onBlur={(event) => updateField(media, { caption: event.target.value || null })}
                  />
                  <Button
                    type="button"
                    variant={media.isFeatured ? 'accent' : 'outline'}
                    onClick={() => updateField(media, { isFeatured: !media.isFeatured })}
                  >
                    {media.isFeatured ? 'Destaque' : 'Marcar destaque'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleDelete(media)}>
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audio" className="pt-4">
          {byType('audio').length === 0 ? (
            <EmptyState title="Nenhum áudio enviado." />
          ) : (
            <div className="flex flex-col gap-2">
              {byType('audio').map((media) => (
                <div
                  key={media.id}
                  className="border-border flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{media.originalName}</span>
                  <Select
                    defaultValue={media.role ?? ''}
                    onChange={(event) => updateField(media, { role: event.target.value || null })}
                  >
                    <option value="">Tipo de registro…</option>
                    {AUDIO_ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                  <Input
                    defaultValue={media.caption ?? ''}
                    placeholder="Legenda / descrição…"
                    onBlur={(event) => updateField(media, { caption: event.target.value || null })}
                  />
                  <Button type="button" variant="outline" onClick={() => handleDelete(media)}>
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documento" className="pt-4">
          {byType('documento').length === 0 ? (
            <EmptyState title="Nenhum documento enviado." />
          ) : (
            <div className="flex flex-col gap-2">
              {byType('documento').map((media) => (
                <div
                  key={media.id}
                  className="border-border flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{media.originalName}</span>
                  <Select
                    defaultValue={media.documentType ?? ''}
                    onChange={(event) =>
                      updateField(media, { documentType: event.target.value || null })
                    }
                  >
                    <option value="">Tipo de documento…</option>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                  <Input
                    defaultValue={media.caption ?? ''}
                    placeholder="Descrição…"
                    onBlur={(event) => updateField(media, { caption: event.target.value || null })}
                  />
                  <Button type="button" variant="outline" onClick={() => handleDelete(media)}>
                    Excluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendencias" className="pt-4">
          {summary.medias.filter(pendingCaption).length === 0 &&
          (checklist?.blockers.length ?? 0) === 0 ? (
            <EmptyState title="Nenhuma pendência — pode publicar." />
          ) : (
            <div className="flex flex-col gap-2">
              {checklist?.blockers.map((blocker) => (
                <p
                  key={blocker}
                  className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  {blocker}
                </p>
              ))}
              {summary.medias.filter(pendingCaption).map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => setActiveTab(media.mediaType)}
                  className="border-border flex items-center justify-between rounded border px-3 py-2 text-left text-sm"
                >
                  <span className="truncate">{media.originalName} — sem legenda</span>
                  <span className="text-muted text-xs">
                    Ir para {ARCHIVE_MEDIA_TYPE_LABELS[media.mediaType]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {message && (
        <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="font-medium">Checklist de publicação</p>
          {checklist && checklist.blockers.length > 0 ? (
            <ul className="text-muted flex flex-col gap-1 text-sm">
              {checklist.blockers.map((blocker) => (
                <li key={blocker}>• {blocker}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-700">Tudo pronto para publicar.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Voltar e enviar mais arquivos
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || !checklist?.canPublish || isPublished}
            >
              {isPublished ? 'Já publicado' : isPublishing ? 'Publicando…' : 'Publicar Evento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
