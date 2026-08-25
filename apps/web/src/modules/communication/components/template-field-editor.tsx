'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { upload } from '@vercel/blob/client';
import type { TemplateField } from '@vl6/domain';
import {
  ART_TEMPLATE_TYPE_LABELS,
  ART_TEMPLATE_TYPES,
  PUBLICATION_OUTPUT_FORMAT_DIMENSIONS,
  PUBLICATION_OUTPUT_FORMAT_LABELS,
  TEMPLATE_FIELD_ALIGNMENTS,
  type ArtTemplateType,
  type PublicationOutputFormat,
} from '@vl6/shared';
import { Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';

export interface TemplateFieldEditorProps {
  mode: 'create' | 'edit';
  action: (
    state: { error: string | null },
    formData: FormData,
  ) => Promise<{ error: string | null }>;
  initial: {
    name: string;
    type: ArtTemplateType;
    backgroundUrl: string | null;
    backgroundWidth: number | null;
    backgroundHeight: number | null;
    outputFormats: PublicationOutputFormat[];
    fields: TemplateField[];
    active: boolean;
  };
}

/**
 * Formato de saída sempre detectado pela proporção real da imagem enviada
 * — nunca escolhido manualmente. Os checkboxes de "Formatos de saída"
 * foram removidos: eles não recortavam nem redimensionavam nada (a
 * publicação sempre exporta as dimensões reais do arquivo, só rotuladas
 * de formas diferentes), então marcar mais de um só confundia sem gerar
 * nenhum resultado visual diferente.
 */
function detectFormat(width: number, height: number): PublicationOutputFormat {
  const ratio = width / height;
  let closest: PublicationOutputFormat = 'feed';
  let smallestDiff = Infinity;
  for (const [format, dims] of Object.entries(PUBLICATION_OUTPUT_FORMAT_DIMENSIONS)) {
    const diff = Math.abs(ratio - dims.width / dims.height);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = format as PublicationOutputFormat;
    }
  }
  return closest;
}

let nextFieldSeq = 0;

function newField(xPercent: number, yPercent: number): TemplateField {
  nextFieldSeq += 1;
  return {
    key: `campo${nextFieldSeq}`,
    label: 'Novo campo',
    type: 'text',
    required: false,
    maxLength: 60,
    xPercent,
    yPercent,
    fontSizePx: 32,
    color: '#0a1845',
    align: 'center',
    options: null,
  };
}

/**
 * Editor visual de posicionamento — cada campo é uma caixa arrastável sobre
 * a prévia da imagem de fundo, em porcentagem (nunca pixel fixo do editor),
 * pra funcionar em qualquer tamanho de tela e ainda bater com o `<canvas>`
 * do gerador de arte, que lê exatamente esses mesmos `xPercent`/`yPercent`.
 */
export function TemplateFieldEditor({ mode, action, initial }: TemplateFieldEditorProps) {
  const [state, formAction] = useActionState(action, { error: null });
  const [name, setName] = useState(initial.name);
  const [type] = useState<ArtTemplateType>(initial.type);
  const [active, setActive] = useState(initial.active);
  const [fields, setFields] = useState<TemplateField[]>(initial.fields);
  // Seleção por índice, nunca pela `key` do campo — `key` é o próprio valor
  // que o formulário deixa o Administrador editar ao lado ("Chave (usada
  // pra preencher automaticamente)"); rastrear a seleção por ela fazia o
  // painel de edição sumir a cada letra digitada, porque o campo editado
  // deixava de bater com a seleção antiga no mesmo instante em que mudava.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initial.fields.length > 0 ? 0 : null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial.backgroundUrl);
  // URL final no Vercel Blob, só depois do upload direto do navegador
  // terminar — `previewUrl` (acima) é só a prévia local instantânea
  // (blob: URL), nunca o valor submetido no formulário.
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(initial.backgroundUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Em modo "edit" a imagem de fundo já existe no Blob — sem carregar as
  // dimensões reais aqui, a caixa da prévia ficava com a proporção padrão
  // (1080x1350) mesmo quando o modelo real era, por exemplo, Story
  // (1080x1920), cortando a imagem visualmente sem que o arquivo em si
  // estivesse errado.
  const [naturalSize, setNaturalSize] = useState({
    width: initial.backgroundWidth ?? 1080,
    height: initial.backgroundHeight ?? 1350,
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Linha-guia tracejada (estilo "smart guides" do Canva) que aparece
  // enquanto um campo arrastado se alinha ao centro da imagem ou a outro
  // campo já posicionado — `null` quando não há alinhamento no momento.
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = selectedIndex !== null ? (fields[selectedIndex] ?? null) : null;

  function updateSelected(patch: Partial<TemplateField>) {
    if (selectedIndex === null) return;
    setFields((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, ...patch } : f)));
  }

  /**
   * Upload direto do navegador pro Vercel Blob (`@vercel/blob/client`) —
   * uma Server Action tem um teto físico de 4,5 MB na Vercel, que uma
   * imagem institucional em alta resolução ultrapassa com frequência
   * ("413 Content Too Large" antes mesmo do código da aplicação rodar).
   * `previewUrl` mostra o arquivo local instantaneamente; `backgroundUrl`
   * só fica pronto quando o upload de verdade termina, e é isso que vai no
   * campo oculto submetido pelo formulário.
   */
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setBackgroundUrl(null);
    setUploadError(null);
    const img = new Image();
    img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;

    setUploading(true);
    upload(`communication/${crypto.randomUUID()}.png`, file, {
      access: 'public',
      handleUploadUrl: '/api/comunicacao/blob-upload',
      contentType: file.type,
    })
      .then((result) => setBackgroundUrl(result.url))
      .catch((error: unknown) => {
        setUploadError(
          error instanceof Error ? `Falha no upload: ${error.message}` : 'Falha no upload.',
        );
      })
      .finally(() => setUploading(false));
  }

  function handlePointerDown(index: number) {
    return (event: React.PointerEvent) => {
      event.preventDefault();
      setSelectedIndex(index);
      setDragIndex(index);
    };
  }

  const SNAP_THRESHOLD_PX = 6;

  function handleCanvasPointerMove(event: React.PointerEvent) {
    if (dragIndex === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let xPercent = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    let yPercent = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    // "Régua" pedida pelo Administrador: em vez de números fixos, o campo
    // arrastado gruda (snap) no centro da imagem ou na posição de outro
    // campo já colocado, como as guias inteligentes do Canva — bem mais
    // fácil de "deixar tudo alinhadinho" do que digitar coordenadas.
    const snapXThreshold = (SNAP_THRESHOLD_PX / rect.width) * 100;
    const snapYThreshold = (SNAP_THRESHOLD_PX / rect.height) * 100;
    const others = fields.filter((_, i) => i !== dragIndex);
    const xCandidates = [0, 50, 100, ...others.map((f) => f.xPercent)];
    const yCandidates = [0, 50, 100, ...others.map((f) => f.yPercent)];

    let snappedX: number | null = null;
    for (const cx of xCandidates) {
      if (Math.abs(xPercent - cx) < snapXThreshold) {
        xPercent = cx;
        snappedX = cx;
        break;
      }
    }
    let snappedY: number | null = null;
    for (const cy of yCandidates) {
      if (Math.abs(yPercent - cy) < snapYThreshold) {
        yPercent = cy;
        snappedY = cy;
        break;
      }
    }

    setGuides({ x: snappedX, y: snappedY });
    setFields((prev) => prev.map((f, i) => (i === dragIndex ? { ...f, xPercent, yPercent } : f)));
  }

  function handleCanvasPointerUp() {
    setDragIndex(null);
    setGuides({ x: null, y: null });
  }

  function addField() {
    const field = newField(50, 50);
    setFields((prev) => {
      setSelectedIndex(prev.length);
      return [...prev, field];
    });
  }

  function removeSelected() {
    if (selectedIndex === null) return;
    setFields((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  }

  const detectedFormat = detectFormat(naturalSize.width, naturalSize.height);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      <input type="hidden" name="backgroundUrl" value={backgroundUrl ?? ''} />
      <input type="hidden" name="backgroundWidth" value={naturalSize.width} />
      <input type="hidden" name="backgroundHeight" value={naturalSize.height} />
      <input type="hidden" name="outputFormats" value={detectedFormat} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold uppercase tracking-wide">
              Prévia — arraste as caixas sobre a imagem
            </span>
            <Button type="button" size="sm" variant="outline" onClick={addField}>
              + Adicionar campo
            </Button>
          </div>

          {/* Único input de arquivo, nunca desmontado — trocar de branch (sem
              imagem ↔ com prévia) desmontaria esse elemento e perderia o
              File já selecionado, mesmo com `previewUrl` continuando a
              mostrar a prévia (state do blob URL, não do input). Sem `name`
              — o arquivo é enviado direto ao Vercel Blob pelo navegador
              (`handleFileChange`), nunca pelo corpo do formulário. */}
          <input
            ref={fileInputRef}
            type="file"
            id="background-input"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          {uploading && <p className="text-muted text-xs">Enviando imagem…</p>}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

          {!previewUrl ? (
            <label
              htmlFor="background-input"
              className="border-border flex h-80 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm"
            >
              <span>Selecione a imagem de fundo do modelo (PNG ou JPEG)</span>
              <span className="text-accent underline">Escolher arquivo</span>
            </label>
          ) : (
            <div
              ref={canvasRef}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
              // `alignSelf: center` tira a caixa do stretch padrão do
              // flex column pai — sem isso, o navegador força a largura a
              // preencher o container inteiro (ignorando aspect-ratio) e só
              // corta a altura depois, deixando uma imagem vertical (Story)
              // enorme e cortada, ou em alguns casos a caixa colapsando
              // sem exibir nada. Com `alignSelf: center` + `height`
              // definido (não `maxHeight`), a largura passa a ser
              // derivada corretamente a partir da proporção real da
              // imagem.
              className="border-border relative select-none overflow-hidden rounded-lg border"
              style={{
                aspectRatio: `${naturalSize.width} / ${naturalSize.height}`,
                height: 'min(65vh, 640px)',
                maxWidth: '100%',
                alignSelf: 'center',
              }}
            >
              <img
                src={previewUrl}
                alt="Prévia do modelo"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              {guides.x !== null && (
                <div
                  className="pointer-events-none absolute inset-y-0 border-l border-dashed"
                  style={{ left: `${guides.x}%`, borderColor: '#d4af37' }}
                />
              )}
              {guides.y !== null && (
                <div
                  className="pointer-events-none absolute inset-x-0 border-t border-dashed"
                  style={{ top: `${guides.y}%`, borderColor: '#d4af37' }}
                />
              )}
              {fields.map((field, index) => (
                <button
                  key={index}
                  type="button"
                  onPointerDown={handlePointerDown(index)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded border-2 px-2 py-1 text-xs font-semibold active:cursor-grabbing"
                  style={{
                    left: `${field.xPercent}%`,
                    top: `${field.yPercent}%`,
                    borderColor: index === selectedIndex ? '#d4af37' : 'rgba(255,255,255,0.7)',
                    color: field.color,
                    fontSize: Math.max(10, field.fontSizePx / 2.4),
                    background: 'rgba(255,255,255,0.55)',
                  }}
                >
                  {field.label}
                </button>
              ))}
              {mode === 'create' && (
                <label
                  htmlFor="background-input"
                  className="absolute bottom-2 right-2 cursor-pointer rounded bg-black/60 px-2 py-1 text-xs text-white"
                >
                  Trocar imagem
                </label>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <FormField label="Nome do modelo" htmlFor="name">
            <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>

          {mode === 'create' ? (
            <FormField label="Tipo" htmlFor="type">
              <Select id="type" name="type" defaultValue={type}>
                {ART_TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ART_TEMPLATE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <div className="text-sm">
              <span className="text-muted text-xs">Tipo</span>
              <p className="font-medium">{ART_TEMPLATE_TYPE_LABELS[type]}</p>
            </div>
          )}

          {previewUrl && (
            <p className="text-muted text-xs">
              Formato: {PUBLICATION_OUTPUT_FORMAT_LABELS[detectedFormat]} ({naturalSize.width}×
              {naturalSize.height}px) — detectado pela imagem enviada.
            </p>
          )}

          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Modelo ativo
            </label>
          )}

          <div className="border-border rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {selected ? `Campo: ${selected.label}` : 'Nenhum campo selecionado'}
              </span>
              {selected && (
                <button
                  type="button"
                  onClick={removeSelected}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>

            {selected && (
              <div className="flex flex-col gap-3">
                <FormField label="Rótulo" htmlFor="field-label">
                  <Input
                    id="field-label"
                    value={selected.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                  />
                </FormField>
                <FormField
                  label="Chave"
                  htmlFor="field-key"
                  description="sessionName/date/time/degree/location (Agenda) ou memberName/memberPhotoUrl/day/month (aniversário)."
                >
                  <Input
                    id="field-key"
                    value={selected.key}
                    onChange={(e) => updateSelected({ key: e.target.value })}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Fonte (px)" htmlFor="field-size">
                    <Input
                      id="field-size"
                      type="number"
                      value={selected.fontSizePx}
                      onChange={(e) => updateSelected({ fontSizePx: Number(e.target.value) })}
                    />
                  </FormField>
                  <FormField label="Cor" htmlFor="field-color">
                    <Input
                      id="field-color"
                      type="color"
                      value={selected.color}
                      onChange={(e) => updateSelected({ color: e.target.value })}
                    />
                  </FormField>
                </div>
                <FormField label="Alinhamento" htmlFor="field-align">
                  <Select
                    id="field-align"
                    value={selected.align}
                    onChange={(e) =>
                      updateSelected({ align: e.target.value as TemplateField['align'] })
                    }
                  >
                    {TEMPLATE_FIELD_ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>
                        {a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Máx. caracteres" htmlFor="field-max">
                  <Input
                    id="field-max"
                    type="number"
                    value={selected.maxLength ?? ''}
                    onChange={(e) =>
                      updateSelected({
                        maxLength: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </FormField>
              </div>
            )}
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton disabled={uploading || (mode === 'create' && !backgroundUrl)} />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Salvando…' : 'Salvar modelo'}
    </Button>
  );
}
