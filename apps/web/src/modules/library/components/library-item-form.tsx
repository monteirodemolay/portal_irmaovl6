'use client';
import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { FileAsset, LibraryCategory, LibraryShelf } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { addLibraryItemAction, type LibraryActionState } from '../actions/library-actions';

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
  return (
    <form action={action} className="grid gap-6" encType="multipart/form-data">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="mx-auto grid w-full max-w-[260px] content-start gap-3 lg:mx-0 lg:max-w-none">
          <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed bg-stone-50 text-sm text-stone-500">
            Capa da obra
          </div>
          <label className="text-sm font-medium">
            Enviar foto
            <Input
              className="w-full min-w-0"
              type="file"
              name="capaUpload"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          <label className="text-sm font-medium">
            Tirar foto
            <Input
              className="w-full min-w-0"
              type="file"
              name="capaCamera"
              accept="image/*"
              capture="environment"
            />
          </label>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Título">
            <Input name="titulo" required />
          </Field>
          <Field label="Autor ou entidade">
            <Input name="autor" />
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
            <Select name="formato" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="fisico">Físico</option>
              <option value="digital">Digital</option>
              <option value="fisico_digital">Físico + digital</option>
            </Select>
          </Field>
          <Field label="Categoria">
            <Select name="categoriaId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Arquivo digital">
            <Select name="fileId" required={format !== 'fisico'} defaultValue="">
              <option value="">Nenhum</option>
              {fileAssets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.titulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ano">
            <Input type="number" name="anoPublicacao" />
          </Field>
          <Field label="Editora">
            <Input name="editora" />
          </Field>
          <Field label="ISBN/ISSN">
            <Input name="isbn" />
          </Field>
          <Field label="Código de classificação">
            <Input name="codigoClassificacao" />
          </Field>
          <Field label="Palavras-chave">
            <Input name="palavrasChave" placeholder="separadas por vírgula" />
          </Field>
          <Field label="Prazo padrão (dias)">
            <Input type="number" name="prazoEmprestimoDias" defaultValue="21" min="1" max="180" />
          </Field>
          {format !== 'digital' && (
            <>
              <Field label="Número de tombo">
                <Input name="codigoTombo" required />
              </Field>
              <Field label="Estante">
                <Select name="shelfId" required defaultValue="">
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} · {s.nome}
                    </option>
                  ))}
                </Select>
              </Field>
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
            Sinopse
            <Textarea name="sinopse" rows={5} />
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
