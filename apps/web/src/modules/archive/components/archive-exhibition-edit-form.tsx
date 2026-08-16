'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ArchiveExhibition } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { updateArchiveExhibitionAction, type ArchiveActionState } from '../actions/archive-actions';

const EMPTY_STATE: ArchiveActionState = { error: null };

export interface ArchiveExhibitionEditFormItem {
  compositeId: string;
  title: string;
  kindLabel: string;
}

interface SectionDraft {
  id: string;
  titulo: string;
  texto: string;
  itemIds: string[];
}

function newSectionId(): string {
  return `secao-${Math.random().toString(36).slice(2, 10)}`;
}

export function ArchiveExhibitionEditForm({
  exhibition,
  availableItems,
}: {
  exhibition: ArchiveExhibition;
  availableItems: ArchiveExhibitionEditFormItem[];
}) {
  const boundAction = updateArchiveExhibitionAction.bind(null, exhibition.id);
  const [state, formAction] = useActionState(boundAction, EMPTY_STATE);
  const [sections, setSections] = useState<SectionDraft[]>(
    exhibition.secoes.map((secao) => ({ ...secao, texto: secao.texto ?? '' })),
  );

  function addSection() {
    setSections((prev) => [...prev, { id: newSectionId(), titulo: '', texto: '', itemIds: [] }]);
  }
  function removeSection(id: string) {
    setSections((prev) => prev.filter((section) => section.id !== id));
  }
  function updateSectionField(id: string, field: 'titulo' | 'texto', value: string) {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, [field]: value } : section)),
    );
  }
  function toggleSectionItem(id: string, itemId: string, checked: boolean) {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== id) return section;
        const itemIds = checked
          ? [...section.itemIds, itemId]
          : section.itemIds.filter((existing) => existing !== itemId);
        return { ...section, itemIds };
      }),
    );
  }

  const secoesJson = JSON.stringify(
    sections.map((section) => ({ ...section, texto: section.texto || null })),
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <input type="hidden" name="secoes" value={secoesJson} />

      <div className="flex flex-col gap-4">
        <FormField label="Título" htmlFor="titulo">
          <Input id="titulo" name="titulo" required defaultValue={exhibition.titulo} />
        </FormField>
        <FormField
          label="Slug"
          htmlFor="slug"
          description="Usado na URL pública (/acervo/exposicoes/seu-slug) — só letras minúsculas, números e hífens."
        >
          <Input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={exhibition.slug}
          />
        </FormField>
        <FormField label="Descrição editorial (opcional)" htmlFor="descricaoEditorial">
          <Textarea
            id="descricaoEditorial"
            name="descricaoEditorial"
            rows={4}
            defaultValue={exhibition.descricaoEditorial ?? ''}
          />
        </FormField>
        <FormField label="Curadoria (opcional)" htmlFor="curadoPor">
          <Input id="curadoPor" name="curadoPor" defaultValue={exhibition.curadoPor ?? ''} />
        </FormField>
        <FormField label="URL da capa (opcional)" htmlFor="capaUrl">
          <Input id="capaUrl" name="capaUrl" type="url" defaultValue={exhibition.capaUrl ?? ''} />
        </FormField>
        <FormField label="Ordem" htmlFor="ordem">
          <Input id="ordem" name="ordem" type="number" min={0} defaultValue={exhibition.ordem} />
        </FormField>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Seções da narrativa</h2>
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            + Adicionar seção
          </Button>
        </div>

        {sections.length === 0 && (
          <p className="text-muted text-sm">
            Nenhuma seção ainda. Adicione a primeira para começar a montar a narrativa.
          </p>
        )}

        {sections.map((section, index) => (
          <fieldset
            key={section.id}
            className="border-border flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <legend className="text-sm font-semibold">Seção {index + 1}</legend>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSection(section.id)}
              >
                Remover
              </Button>
            </div>

            <FormField label="Título da seção" htmlFor={`${section.id}-titulo`}>
              <Input
                id={`${section.id}-titulo`}
                value={section.titulo}
                onChange={(event) => updateSectionField(section.id, 'titulo', event.target.value)}
              />
            </FormField>
            <FormField label="Texto curatorial (opcional)" htmlFor={`${section.id}-texto`}>
              <Textarea
                id={`${section.id}-texto`}
                rows={3}
                value={section.texto}
                onChange={(event) => updateSectionField(section.id, 'texto', event.target.value)}
              />
            </FormField>

            <div>
              <p className="mb-2 text-sm font-medium">Itens desta seção</p>
              {availableItems.length === 0 ? (
                <p className="text-muted text-sm">Nenhum item disponível ainda.</p>
              ) : (
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {availableItems.map((item) => (
                    <label key={item.compositeId} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={section.itemIds.includes(item.compositeId)}
                        onChange={(event) =>
                          toggleSectionItem(section.id, item.compositeId, event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="text-muted text-[10px] font-semibold uppercase tracking-wide">
                          {item.kindLabel}
                        </span>
                        <br />
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </fieldset>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar alterações'}
    </Button>
  );
}
