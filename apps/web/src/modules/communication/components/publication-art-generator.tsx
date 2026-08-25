'use client';

import { useRef, useState, useTransition } from 'react';
import type { ArtTemplate, Publication } from '@vl6/domain';
import {
  PUBLICATION_CHANNELS,
  PUBLICATION_CHANNEL_LABELS,
  PUBLICATION_OUTPUT_FORMAT_LABELS,
  type PublicationChannel,
  type PublicationOutputFormat,
} from '@vl6/shared';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  approvePublicationAction,
  archivePublicationAction,
  markPublicationAsPublishedAction,
  updatePublicationAction,
  uploadPublicationAssetAction,
} from '../actions/communication-actions';

/** Só as chaves "bem-conhecidas" ganham um texto de restauração explícito no botão de ajuda. */
const KNOWN_FIELD_HINT: Record<string, string> = {
  sessionName: 'Preenchido automaticamente a partir do Evento da Agenda.',
  date: 'Preenchido automaticamente a partir do Evento da Agenda.',
  time: 'Preenchido automaticamente a partir do Evento da Agenda.',
  degree: 'Preenchido automaticamente a partir do Evento da Agenda.',
  location: 'Preenchido automaticamente a partir do Evento da Agenda.',
  memberName: 'Preenchido automaticamente a partir do cadastro autorizado do Irmão.',
  day: 'Preenchido automaticamente a partir do cadastro autorizado do Irmão.',
  month: 'Preenchido automaticamente a partir do cadastro autorizado do Irmão.',
};

async function drawCanvas(
  canvas: HTMLCanvasElement,
  template: ArtTemplate,
  fields: Record<string, string>,
): Promise<void> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = template.backgroundUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Não foi possível carregar o modelo.'));
  });

  canvas.width = template.backgroundWidth;
  canvas.height = template.backgroundHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível.');

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'middle';

  for (const field of template.fields) {
    const value = fields[field.key] ?? '';
    if (!value) continue;
    ctx.fillStyle = field.color;
    ctx.textAlign = field.align;
    let fontSize = field.fontSizePx;
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    const maxWidth = canvas.width * 0.86;
    while (ctx.measureText(value).width > maxWidth && fontSize > 12) {
      fontSize -= 1;
      ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    }
    ctx.fillText(
      value,
      (field.xPercent / 100) * canvas.width,
      (field.yPercent / 100) * canvas.height,
    );
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar PNG.'))),
      'image/png',
      1,
    );
  });
}

export function PublicationArtGenerator({
  publication,
  template,
}: {
  publication: Publication;
  template: ArtTemplate;
}) {
  const [fields, setFields] = useState<Record<string, string>>(publication.fields);
  const [caption, setCaption] = useState(publication.caption ?? '');
  const [whatsappText, setWhatsappText] = useState(publication.whatsappText ?? '');
  const [channels, setChannels] = useState<Set<PublicationChannel>>(new Set(publication.channels));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isEditable =
    publication.publicacaoStatus === 'draft' ||
    publication.publicacaoStatus === 'awaiting_approval';

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3200);
  }

  async function renderPreview() {
    if (!canvasRef.current) return;
    try {
      await drawCanvas(canvasRef.current, template, fields);
    } catch {
      notify('Não foi possível renderizar a prévia.');
    }
  }

  async function saveFields() {
    const result = await updatePublicationAction(publication.id, {
      title: publication.title,
      fields,
      caption: caption || null,
      whatsappText: whatsappText || null,
    });
    if (result.error) notify(result.error);
    else notify('Alterações salvas.');
  }

  async function generateAndUpload(format: PublicationOutputFormat) {
    if (!canvasRef.current) return;
    await renderPreview();
    const blob = await canvasToBlob(canvasRef.current);
    const formData = new FormData();
    formData.set('asset', new File([blob], `${format}.png`, { type: 'image/png' }));
    formData.set('format', format);
    formData.set('width', String(canvasRef.current.width));
    formData.set('height', String(canvasRef.current.height));
    const result = await uploadPublicationAssetAction(publication.id, formData);
    if (result.error) notify(result.error);
    else notify('Imagem gerada com sucesso.');
    return blob;
  }

  async function downloadFormat(format: PublicationOutputFormat) {
    const blob = await generateAndUpload(format);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${publication.title.replace(/\s+/g, '-').toLowerCase()}-${format}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function shareFormat(format: PublicationOutputFormat) {
    const blob = await generateAndUpload(format);
    if (!blob) return;
    const file = new File([blob], `${format}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: publication.title,
          text: whatsappText || caption || '',
          files: [file],
        });
      } catch {
        // cancelamento do usuário — nada a fazer.
      }
    } else {
      await downloadFormat(format);
      notify('Imagem baixada. Agora você pode anexá-la no WhatsApp.');
    }
  }

  function toggleChannel(channel: PublicationChannel) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-muted text-xs font-semibold uppercase tracking-wide">
            Prévia em tempo real
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => void renderPreview()}>
            Atualizar prévia
          </Button>
        </div>
        <div className="border-border overflow-hidden rounded-lg border">
          <canvas ref={canvasRef} className="w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {template.outputFormats.map((format) => (
            <div key={format} className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => startTransition(() => void downloadFormat(format))}
              >
                Baixar ({PUBLICATION_OUTPUT_FORMAT_LABELS[format]})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => startTransition(() => void shareFormat(format))}
              >
                Compartilhar
              </Button>
            </div>
          ))}
        </div>
        {message && <p className="text-sm">{message}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <div className="border-border rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Campos da arte</h2>
          <div className="flex flex-col gap-3">
            {template.fields.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                htmlFor={`field-${field.key}`}
                description={KNOWN_FIELD_HINT[field.key]}
              >
                <Input
                  id={`field-${field.key}`}
                  value={fields[field.key] ?? ''}
                  maxLength={field.maxLength ?? undefined}
                  disabled={!isEditable}
                  onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </FormField>
            ))}
          </div>
        </div>

        <FormField label="Legenda (Instagram)" htmlFor="caption">
          <Textarea
            id="caption"
            value={caption}
            disabled={!isEditable}
            onChange={(e) => setCaption(e.target.value)}
          />
        </FormField>
        <FormField label="Texto para WhatsApp" htmlFor="whatsappText">
          <Textarea
            id="whatsappText"
            value={whatsappText}
            disabled={!isEditable}
            onChange={(e) => setWhatsappText(e.target.value)}
          />
        </FormField>

        {isEditable && (
          <Button type="button" variant="outline" onClick={() => void saveFields()}>
            Salvar campos e legendas
          </Button>
        )}

        <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Fluxo de aprovação</h2>

          {publication.publicacaoStatus === 'awaiting_approval' && (
            <Button
              type="button"
              disabled={publication.assets.length === 0}
              onClick={() =>
                startTransition(async () => {
                  await approvePublicationAction(publication.id);
                  notify('Publicação aprovada.');
                })
              }
            >
              Aprovar publicação
            </Button>
          )}

          {publication.publicacaoStatus === 'ready' && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Canais onde foi publicada</span>
              <div className="flex flex-wrap gap-2">
                {PUBLICATION_CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={channels.has(channel)}
                      onChange={() => toggleChannel(channel)}
                    />
                    {PUBLICATION_CHANNEL_LABELS[channel]}
                  </label>
                ))}
              </div>
              <Button
                type="button"
                disabled={channels.size === 0}
                onClick={() =>
                  startTransition(async () => {
                    await markPublicationAsPublishedAction(publication.id, [...channels]);
                    notify('Marcada como publicada.');
                  })
                }
              >
                Marcar como publicada
              </Button>
            </div>
          )}

          {publication.publicacaoStatus !== 'archived' && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                startTransition(async () => {
                  await archivePublicationAction(publication.id);
                  notify('Publicação arquivada.');
                })
              }
            >
              Arquivar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
