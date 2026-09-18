'use client';

import { useActionState, useCallback, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type {
  FileAsset,
  LibraryCategory,
  LibraryCopy,
  LibraryItem,
  LibraryShelf,
} from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import {
  addLibraryItemAction,
  updateLibraryItemAction,
  type LibraryActionState,
} from '../actions/library-actions';
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
  item,
  copy,
}: {
  categories: LibraryCategory[];
  fileAssets: FileAsset[];
  shelves: LibraryShelf[];
  item?: LibraryItem;
  copy?: LibraryCopy | null;
}) {
  const submitAction = item ? updateLibraryItemAction.bind(null, item.id) : addLibraryItemAction;
  const [state, action] = useActionState<LibraryActionState, FormData>(submitAction, {
    error: null,
  });
  const [format, setFormat] = useState(item?.formato ?? 'fisico');
  const [digitalSource, setDigitalSource] = useState<'existing' | 'upload' | 'link'>(
    item?.urlExterna ? 'link' : 'existing',
  );
  const [fields, setFields] = useState<SuggestedFields>(() =>
    item
      ? {
          titulo: item.titulo ?? '',
          autor: item.autor ?? '',
          anoPublicacao: item.anoPublicacao ? String(item.anoPublicacao) : '',
          editora: item.editora ?? '',
          isbn: item.isbn ?? '',
          codigoBarras: item.codigoBarras ?? '',
          palavrasChave: item.palavrasChave?.join(', ') ?? '',
          sinopse: item.sinopse ?? '',
        }
      : EMPTY_FIELDS,
  );
  const [categoryOptions, setCategoryOptions] = useState(
    categories.map(({ id, nome }) => ({ id, nome })),
  );
  const [shelfOptions, setShelfOptions] = useState(
    shelves.map(({ id, codigo, nome }) => ({ id, codigo, nome })),
  );
  const [categoryId, setCategoryId] = useState(item?.categoriaId ?? '');
  const [shelfId, setShelfId] = useState(copy?.shelfId ?? '');

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
        <BookCaptureAssistant onSuggestion={applySuggestion} initialCoverUrl={item?.capaUrl} />
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
            <Select name="tipoMaterial" defaultValue={item?.tipoMaterial ?? 'livro'}>
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
              onChange={(event) =>
                setFormat(event.target.value as 'digital' | 'fisico' | 'fisico_digital')
              }
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

          {format !== 'fisico' && (
            <fieldset className="border-border grid gap-3 rounded-xl border p-4 sm:col-span-2">
              <legend className="px-1 text-sm font-medium">Conteúdo digital</legend>
              <p className="text-muted text-xs">
                Escolha uma única origem para o arquivo desta publicação.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ['existing', 'Já cadastrado'],
                    ['upload', 'Enviar arquivo'],
                    ['link', 'Informar link'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${digitalSource === value ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <input
                      type="radio"
                      name="digitalSource"
                      value={value}
                      checked={digitalSource === value}
                      onChange={() => setDigitalSource(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {digitalSource === 'existing' && (
                <Field label="Arquivo já cadastrado">
                  <Select name="fileId" required defaultValue={item?.fileId ?? ''}>
                    <option value="">Selecione…</option>
                    {fileAssets.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.titulo}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {digitalSource === 'upload' && (
                <Field label="Enviar arquivo agora">
                  <Input
                    name="arquivoDigitalUpload"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    required
                  />
                  <span className="text-muted text-xs">PDF, DOC ou DOCX, com até 12 MB.</span>
                </Field>
              )}
              {digitalSource === 'link' && (
                <Field label="Link externo do livro ou publicação">
                  <Input
                    name="urlExterna"
                    type="url"
                    inputMode="url"
                    placeholder="https://exemplo.org/publicacao"
                    defaultValue={item?.urlExterna ?? ''}
                    required
                  />
                  <span className="text-muted text-xs">
                    Use um endereço HTTPS autorizado e estável.
                  </span>
                </Field>
              )}
            </fieldset>
          )}
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
            <Input name="codigoClassificacao" defaultValue={item?.codigoClassificacao ?? ''} />
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
            <Input
              type="number"
              name="prazoEmprestimoDias"
              defaultValue={item?.prazoEmprestimoDias ?? 21}
              min="1"
              max="180"
            />
          </Field>

          {format !== 'digital' && (
            <>
              <div className="border-border bg-muted/30 grid gap-1 rounded-xl border p-3 text-sm">
                <span className="font-medium">Número de tombo</span>
                <strong>{copy?.codigoTombo ?? 'Gerado automaticamente ao publicar'}</strong>
                <span className="text-muted text-xs">Padrão: VL6-ANO-XXXXXXXX</span>
              </div>
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
                <Select name="estadoGeral" defaultValue={copy?.estadoGeral ?? 'bom'}>
                  <option value="novo">Novo</option>
                  <option value="otimo">Ótimo</option>
                  <option value="bom">Bom</option>
                  <option value="regular">Regular</option>
                  <option value="danificado">Danificado</option>
                  <option value="restauracao">Em restauração</option>
                </Select>
              </Field>
              <Field label="Observação do exemplar">
                <Input name="observacoesExemplar" defaultValue={copy?.observacoes ?? ''} />
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
            <Textarea
              name="parecerBibliotecario"
              rows={4}
              defaultValue={item?.parecerBibliotecario ?? ''}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="permiteLeituraOnline"
              defaultChecked={item?.permiteLeituraOnline ?? true}
            />{' '}
            Permitir leitura online
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit editing={Boolean(item)} />
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

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full sm:w-fit" disabled={pending}>
      {pending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Publicar no catálogo'}
    </Button>
  );
}
