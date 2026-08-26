'use client';

import { useState } from 'react';
import {
  Button,
  EmptyState,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vl6/ui';
import type { ArchiveItemSummaryMedia } from '../../actions/publish-hub-actions';
import { PeoplePicker } from './people-picker';
import { EventContextBar, StepTitle } from './wizard-chrome';
import type { ArchiveItemWorkspace } from './use-archive-item-workspace';

function mediaThumb(media: ArchiveItemSummaryMedia) {
  return `/api/archive-media/${media.id}`;
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

type OrganizeTab = 'foto' | 'video' | 'documento' | 'audio';
const TABS: { key: OrganizeTab; label: string }[] = [
  { key: 'foto', label: 'Fotografias' },
  { key: 'video', label: 'Vídeos' },
  { key: 'documento', label: 'Documentos' },
  { key: 'audio', label: 'Áudios' },
];

export interface OrganizeStepProps {
  workspace: ArchiveItemWorkspace;
  eventTitle: string;
  eventDate: Date;
  eventLocal: string;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Passo 4 do wizard — "Organização". Fotografias ganham a grade com
 * arraste-para-reordenar e seleção de capa (estilo do mock-up aprovado);
 * os demais tipos mantêm a edição por linha já existente (papel/legenda/
 * pessoas/destaque), só movida do antigo `ReviewStep` pra cá.
 */
export function OrganizeStep({
  workspace,
  eventTitle,
  eventDate,
  eventLocal,
  onBack,
  onContinue,
}: OrganizeStepProps) {
  const [activeTab, setActiveTab] = useState<OrganizeTab>('foto');
  const {
    summary,
    isLoading,
    memberOptions,
    byType,
    updateField,
    handleSetCover,
    handleDelete,
    setDragId,
    handleDrop,
    message,
  } = workspace;

  if (isLoading) return <p className="text-muted text-sm">Carregando…</p>;
  if (!summary) return <EmptyState title="Não foi possível carregar este item." />;

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
          n={4}
          title="Organize o álbum do evento"
          text="Escolha a capa e ajuste a ordem das fotografias."
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrganizeTab)}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label} <span className="text-muted">({byType(tab.key).length})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="foto" className="pt-4">
            {byType('foto').length === 0 ? (
              <EmptyState title="Nenhuma fotografia enviada." />
            ) : (
              <>
                <p className="text-muted mb-3 text-xs">
                  ☷ Arraste para reordenar · clique numa foto pra defini-la como capa
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {byType('foto').map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragId(media.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(media.id)}
                      onClick={() => handleSetCover(media)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                        media.isCover ? 'border-accent' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={mediaThumb(media)}
                        alt={media.altText ?? media.originalName}
                        className="h-full w-full object-cover"
                      />
                      {media.isCover && (
                        <span className="bg-accent text-primary-dark absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          ★ CAPA
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
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
                    className="border-border flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
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
                      onBlur={(event) =>
                        updateField(media, { caption: event.target.value || null })
                      }
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

          <TabsContent value="documento" className="pt-4">
            {byType('documento').length === 0 ? (
              <EmptyState title="Nenhum documento enviado." />
            ) : (
              <div className="flex flex-col gap-2">
                {byType('documento').map((media) => (
                  <div
                    key={media.id}
                    className="border-border flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
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
                      onBlur={(event) =>
                        updateField(media, { caption: event.target.value || null })
                      }
                    />
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
                    className="border-border flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
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
                      onBlur={(event) =>
                        updateField(media, { caption: event.target.value || null })
                      }
                    />
                    <Button type="button" variant="outline" onClick={() => handleDelete(media)}>
                      Excluir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {activeTab === 'foto' && byType('foto').length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm font-medium">Legendas e pessoas nas fotografias</p>
            {byType('foto').map((media) => (
              <div
                key={media.id}
                className="border-border flex flex-col gap-2 rounded-lg border p-3"
              >
                <span className="truncate text-sm font-medium">{media.originalName}</span>
                <Input
                  defaultValue={media.caption ?? ''}
                  placeholder="Legenda…"
                  onBlur={(event) => updateField(media, { caption: event.target.value || null })}
                />
                <PeoplePicker
                  selectedIds={media.pessoasIdentificadas}
                  options={memberOptions}
                  onChange={(ids) => updateField(media, { pessoasIdentificadas: ids })}
                />
              </div>
            ))}
          </div>
        )}

        {message && (
          <p className={`mt-4 text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
            {message.text}
          </p>
        )}

        <p className="text-muted mt-5 text-xs">
          ✓ Ordem salva automaticamente · Clique em uma foto para defini-la como capa
        </p>

        <div className="mt-3">
          <Button type="button" onClick={onContinue}>
            Continuar →
          </Button>
        </div>
      </div>
    </>
  );
}
