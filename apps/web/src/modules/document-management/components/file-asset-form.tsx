'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { FILE_KINDS, FILE_KIND_LABELS } from '@vl6/shared';
import type { FileCategory } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createFileAssetAction,
  type DocumentManagementActionState,
} from '../actions/document-management-actions';

export function FileAssetForm({ categories }: { categories: FileCategory[] }) {
  const [state, formAction] = useActionState<DocumentManagementActionState, FormData>(
    createFileAssetAction,
    { error: null },
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input id="titulo" name="titulo" required />
      </FormField>
      <FormField label="Descrição (opcional)" htmlFor="descricao">
        <Textarea id="descricao" name="descricao" rows={3} />
      </FormField>
      <FormField label="Categoria" htmlFor="categoriaId">
        <Select id="categoriaId" name="categoriaId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nome}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Tipo do arquivo" htmlFor="tipo">
        <Select id="tipo" name="tipo" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {FILE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {FILE_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Autor (opcional)" htmlFor="autor">
        <Input id="autor" name="autor" />
      </FormField>
      <FormField label="Acervo (opcional)" htmlFor="acervo">
        <Input id="acervo" name="acervo" />
      </FormField>
      <FormField label="Arquivo" htmlFor="file" description="Enviado diretamente ao Storage.">
        <input
          id="file"
          name="file"
          type="file"
          required
          className="border-border bg-surface w-full rounded border px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Ordem" htmlFor="ordem">
        <Input id="ordem" name="ordem" type="number" min={0} defaultValue={0} />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="permitirDownload" className="h-4 w-4" defaultChecked />
        Permitir download pelos Irmãos
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Enviando…' : 'Enviar arquivo'}
    </Button>
  );
}
