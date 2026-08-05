'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { FileAsset, LibraryCategory } from '@vl6/domain';
import { Button, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { addLibraryItemAction, type LibraryActionState } from '../actions/library-actions';

export function LibraryItemForm({
  categories,
  fileAssets,
}: {
  categories: LibraryCategory[];
  fileAssets: FileAsset[];
}) {
  const [state, formAction] = useActionState<LibraryActionState, FormData>(addLibraryItemAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField
        label="Arquivo"
        htmlFor="fileId"
        description="Cataloga um arquivo já enviado em Arquivos — não duplica o binário."
      >
        <Select id="fileId" name="fileId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {fileAssets.map((file) => (
            <option key={file.id} value={file.id}>
              {file.titulo}
            </option>
          ))}
        </Select>
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
      <FormField label="Subcategoria (opcional)" htmlFor="subcategoriaId">
        <Select id="subcategoriaId" name="subcategoriaId" defaultValue="">
          <option value="">Nenhuma</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nome}
            </option>
          ))}
        </Select>
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="permiteLeituraOnline" className="h-4 w-4" defaultChecked />
        Permitir leitura online (visualizar sem baixar)
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
      {pending ? 'Adicionando…' : 'Adicionar à Biblioteca'}
    </Button>
  );
}
