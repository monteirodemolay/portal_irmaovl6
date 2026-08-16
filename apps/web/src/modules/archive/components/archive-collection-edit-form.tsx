'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ArchiveCollection } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { updateArchiveCollectionAction, type ArchiveActionState } from '../actions/archive-actions';

const EMPTY_STATE: ArchiveActionState = { error: null };

export interface ArchiveCollectionEditFormItem {
  compositeId: string;
  title: string;
  kindLabel: string;
}

export function ArchiveCollectionEditForm({
  collection,
  availableItems,
}: {
  collection: ArchiveCollection;
  availableItems: ArchiveCollectionEditFormItem[];
}) {
  const boundAction = updateArchiveCollectionAction.bind(null, collection.id);
  const [state, formAction] = useActionState(boundAction, EMPTY_STATE);
  const selectedIds = new Set(collection.itemIds);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FormField label="Título" htmlFor="titulo">
          <Input id="titulo" name="titulo" required defaultValue={collection.titulo} />
        </FormField>
        <FormField
          label="Slug"
          htmlFor="slug"
          description="Usado na URL pública (/acervo/colecoes/seu-slug) — só letras minúsculas, números e hífens."
        >
          <Input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={collection.slug}
          />
        </FormField>
        <FormField label="Descrição editorial (opcional)" htmlFor="descricaoEditorial">
          <Textarea
            id="descricaoEditorial"
            name="descricaoEditorial"
            rows={4}
            defaultValue={collection.descricaoEditorial ?? ''}
          />
        </FormField>
        <FormField label="Curadoria (opcional)" htmlFor="curadoPor">
          <Input id="curadoPor" name="curadoPor" defaultValue={collection.curadoPor ?? ''} />
        </FormField>
        <FormField label="URL da capa (opcional)" htmlFor="capaUrl">
          <Input id="capaUrl" name="capaUrl" type="url" defaultValue={collection.capaUrl ?? ''} />
        </FormField>
        <FormField label="Ordem" htmlFor="ordem">
          <Input id="ordem" name="ordem" type="number" min={0} defaultValue={collection.ordem} />
        </FormField>
      </div>

      <fieldset className="border-border flex flex-col gap-2 rounded-lg border p-4">
        <legend className="text-sm font-semibold">Itens da coleção</legend>
        {availableItems.length === 0 ? (
          <p className="text-muted text-sm">
            Nenhum documento, item de biblioteca ou álbum publicado disponível ainda.
          </p>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {availableItems.map((item) => (
              <label key={item.compositeId} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="itemIds"
                  value={item.compositeId}
                  defaultChecked={selectedIds.has(item.compositeId)}
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
      </fieldset>

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
