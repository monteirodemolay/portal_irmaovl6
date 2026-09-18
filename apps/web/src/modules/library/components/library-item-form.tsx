'use client';

import { useActionState, useCallback, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { FileAsset, LibraryCategory, LibraryShelf } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { addLibraryItemAction, type LibraryActionState } from '../actions/library-actions';
import { BookCaptureAssistant, type BookCaptureResult } from './book-capture-assistant';
import { CreateLibraryCategoryDialog } from './create-library-category-dialog';
import { CreateLibraryShelfDialog } from './create-library-shelf-dialog';

interface SuggestedFields {
  titulo: string;
  autor: string;
  anoPublicacao: string;
  editora: string;
  isbn: string;
  codigoBarras: string;
  palavrasChave: string;
  sinopse: string;
}

const EMPTY_FIELDS: SuggestedFields = {
  titulo: '',
  autor: '',
  anoPublicacao: '',
  editora: '',
  isbn: '',
  codigoBarras: '',
  palavrasChave: '',
  sinopse: '',
};

export function LibraryItemForm({
  categories,
  fileAssets,
  shelves,
}: {
  categories: LibraryCategory[];
  fileAssets: FileAsset[];
  shelves: LibraryShelf[];
}) {
  const [state, action] = useActionState<LibraryActionState, FormData>(addLibraryItemAction, {
    error: null,
  });
  const [format, setFormat] = useState('fisico');
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [categoryOptions, setCategoryOptions] = useState(
    categories.map(({ id, nome }) => ({ id, nome })),
  );
  const [shelfOptions, setShelfOptions] = useState(
    shelves.map(({ id, codigo, nome }) => ({ id, codigo, nome })),
  );
  const [categoryId, setCategoryId] = useState('');
  const [shelfId, setShelfId] = useState('');

  const applySuggestion = useCallback((suggestion: BookCaptureResult) => {
    setFields((current) => ({
      titulo: current.titulo || suggestion.titulo || '',
      autor: current.autor || suggestion.autor || '',
      anoPublicacao:
        current.anoPublicacao || (suggestion.anoPublicacao ? String(suggestion.anoPublicacao) : ''),
      editora: current.editora || suggestion.editora || '',
      isbn: current.isbn || suggestion.isbn || '',
      codigoBarras: current.codigoBarras || suggestion.codigoBarras || '',
      palavrasChave:
        current.palavrasChave || (suggestion.palavrasChave?.filter(Boolean).join(', ') ?? ''),
      sinopse: current.sinopse || suggestion.sinopse || '',
    }));
  }, []);

  const addCategory = useCallback((category: { id: string; nome: string }) => {
    setCategoryOptions((current) => [...current, category]);
    setCategoryId(category.id);
  }, []);

  const addShelf = useCallback((shelf: { id: string; codigo: string; nome: string }) => {
    setShelfOptions((current) => [...current, shelf]);
    setShelfId(shelf.id);
  }, []);

  const updateField = (field: keyof SuggestedFields, value: string) =>
    setFields((current) => ({ ...current, [field]: value }));

  return (
    <form action={action} className="grid gap-6" encType="multipart/form-data">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <BookCaptureAssistant onSuggestion={applySuggestion} />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Título">
            <Input
              name="titulo"
              required
              value={fields.titulo}
              onChange={(event) => updateField('titulo', event.target.value)}
            />
          </Field>
          <Field label="Autor ou entidade">
            <Input
              name="autor"
              value={fields.autor}
              onChange={(event) => updateField('autor', event.target.value)}
            />
          </Field>
          <Field label="Tipo">
            <Select name="tipoMaterial" defaultValue="livro">
              <option value="livro">Livro</option>
              <option value="artigo">Artigo</option>
              <option value="periodico">Periódico</option>
              <option value="publicacao">Publicação</option>
              <option value="outro">Outro</option>
            </Select>
          </Field>
          <Field label="Formato">
            <Select
              name="formato"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
            >
              <option value="fisico">Físico</option>
              <option value="digital">Digital</option>
              <option value="fisico_digital">Físico + digital</option>
            </Select>
          </Field>

          <div className="grid gap-2 text-sm">
            <label className="grid gap-1">
              Categoria
              <Select
                name="categoriaId"
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nome}
                  </option>
                ))}
              </Select>
            </label>
            <CreateLibraryCategoryDialog
              categories={categoryOptions}
              onCreated={addCategory}
              className="w-full sm:w-fit"
            />
          </div>

          <Field label="Arquivo digital">
            <Select name="fileId" required={format !== 'fisico'} defaultValue="">
              <option value="">Nenhum</option>
              {fileAssets.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.titulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ano">
            <Input
              type="number"
              name="anoPublicacao"
              value={fields.anoPublicacao}
              onChange={(event) => updateField('anoPublicacao', event.target.value)}
            />
          </Field>
          <Field label="Editora">
            <Input
              name="editora"
              value={fields.editora}
              onChange={(event) => updateField('editora', event.target.value)}
            />
          </Field>
          <Field label="ISBN/ISSN">
            <Input
              name="isbn"
              value={fields.isbn}
              onChange={(event) => updateField('isbn', event.target.value)}
            />
          </Field>
          <Field label="Código de barras/EAN">
            <Input
              name="codigoBarras"
              inputMode="numeric"
              value={fields.codigoBarras}
              onChange={(event) => updateField('codigoBarras', event.target.value)}
            />
          </Field>
          <Field label="Código de classificação">
            <Input name="codigoClassificacao" />
          </Field>
          <Field label="Palavras-chave">
            <Input
              name="palavrasChave"
              placeholder="separadas por vírgula"
              value={fields.palavrasChave}
              onChange={(event) => updateField('palavrasChave', event.target.value)}
            />
          </Field>
          <Field label="Prazo padrão (dias)">
            <Input type="number" name="prazoEmprestimoDias" defaultValue="21" min="1" max="180" />
          </Field>

          {format !== 'digital' && (
            <>
              <Field label="Número de tombo">
                <Input name="codigoTombo" required />
              </Field>
              <div className="grid gap-2 text-sm">
                <label className="grid gap-1">
                  Estante
                  <Select
                    name="shelfId"
                    required
                    value={shelfId}
                    onChange={(event) => setShelfId(event.target.value)}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {shelfOptions.map((shelf) => (
                      <option key={shelf.id} value={shelf.id}>
                        {shelf.codigo} · {shelf.nome}
                      </option>
                    ))}
                  </Select>
                </label>
                <CreateLibraryShelfDialog onCreated={addShelf} className="w-full sm:w-fit" />
              </div>
              <Field label="Estado geral">
                <Select name="estadoGeral" defaultValue="bom">
                  <option value="novo">Novo</option>
                  <option value="otimo">Ótimo</option>
                  <option value="bom">Bom</option>
                  <option value="regular">Regular</option>
                  <option value="danificado">Danificado</option>
                  <option value="restauracao">Em restauração</option>
                </Select>
              </Field>
              <Field label="Observação do exemplar">
                <Input name="observacoesExemplar" />
              </Field>
            </>
          )}

          <label className="grid gap-1 text-sm sm:col-span-2">
            Sinopse extraída ou informada
            <Textarea
              name="sinopse"
              rows={8}
              value={fields.sinopse}
              onChange={(event) => updateField('sinopse', event.target.value)}
            />
            <span className="text-muted text-xs">
              Revise o texto extraído da contracapa antes de publicar.
            </span>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Dica do Bibliotecário
            <Textarea name="parecerBibliotecario" rows={4} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permiteLeituraOnline" defaultChecked /> Permitir leitura
            online
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit />
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      {children}
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full sm:w-fit" disabled={pending}>
      {pending ? 'Publicando…' : 'Publicar no catálogo'}
    </Button>
  );
}
