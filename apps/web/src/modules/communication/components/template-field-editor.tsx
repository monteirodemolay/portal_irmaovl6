'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { TemplateField } from '@vl6/domain';
import {
  ART_TEMPLATE_TYPE_LABELS,
  ART_TEMPLATE_TYPES,
  PUBLICATION_OUTPUT_FORMAT_LABELS,
  PUBLICATION_OUTPUT_FORMATS,
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
    outputFormats: PublicationOutputFormat[];
    fields: TemplateField[];
    active: boolean;
  };
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
  const [outputFormats, setOutputFormats] = useState<Set<PublicationOutputFormat>>(
    new Set(initial.outputFormats.length > 0 ? initial.outputFormats : ['feed']),
  );
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
  const [naturalSize, setNaturalSize] = useState({ width: 1080, height: 1350 });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = selectedIndex !== null ? (fields[selectedIndex] ?? null) : null;

  function updateSelected(patch: Partial<TemplateField>) {
    if (selectedIndex === null) return;
    setFields((prev) => prev.map((f, i) => (i === selectedIndex ? { ...f, ...patch } : f)));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
  }

  function handlePointerDown(index: number) {
    return (event: React.PointerEvent) => {
      event.preventDefault();
      setSelectedIndex(index);
      setDragIndex(index);
    };
  }

  function handleCanvasPointerMove(event: React.PointerEvent) {
    if (dragIndex === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPercent = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    setFields((prev) => prev.map((f, i) => (i === dragIndex ? { ...f, xPercent, yPercent } : f)));
  }

  function handleCanvasPointerUp() {
    setDragIndex(null);
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

  function toggleFormat(format: PublicationOutputFormat) {
    setOutputFormats((prev) => {
      const next = new Set(prev);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      <input type="hidden" name="backgroundWidth" value={naturalSize.width} />
      <input type="hidden" name="backgroundHeight" value={naturalSize.height} />
      {[...outputFormats].map((format) => (
        <input key={format} type="hidden" name="outputFormats" value={format} />
      ))}

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
              mostrar a prévia (state do blob URL, não do input). */}
          <input
            ref={fileInputRef}
            type="file"
            id="background-input"
            name="background"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

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
              className="border-border relative w-full select-none overflow-hidden rounded-lg border"
              style={{ aspectRatio: `${naturalSize.width} / ${naturalSize.height}` }}
            >
              <img
                src={previewUrl}
                alt="Prévia do modelo"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Formatos de saída</span>
            <div className="flex flex-wrap gap-2">
              {PUBLICATION_OUTPUT_FORMATS.map((format) => (
                <label key={format} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={outputFormats.has(format)}
                    onChange={() => toggleFormat(format)}
                  />
                  {PUBLICATION_OUTPUT_FORMAT_LABELS[format]}
                </label>
              ))}
            </div>
          </div>

          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Modelo ativo (disponível pra gerar novas artes)
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
                  label="Chave (usada pra preencher automaticamente)"
                  htmlFor="field-key"
                  description="Use sessionName, date, time, degree ou location pra sincronizar com a Agenda; memberName, memberPhotoUrl, day ou month pra aniversário."
                >
                  <Input
                    id="field-key"
                    value={selected.key}
                    onChange={(e) => updateSelected({ key: e.target.value })}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Tamanho da fonte (px)" htmlFor="field-size">
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
                <FormField label="Tamanho máximo do texto" htmlFor="field-max">
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
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar modelo'}
    </Button>
  );
}
