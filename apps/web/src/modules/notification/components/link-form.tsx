'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Link } from '@vl6/domain';
import {
  LINK_ACCESS_TYPE_KEYS,
  LINK_ACCESS_TYPE_LABELS,
  LINK_CATEGORY_KEYS,
  LINK_CATEGORY_LABELS,
} from '@vl6/shared';
import { Button, Input, Select, Switch, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { LinkActionState } from '../actions/link-admin-actions';

export interface LinkFormProps {
  action: (state: LinkActionState, formData: FormData) => Promise<LinkActionState>;
  link?: Link;
  /** Pré-preenche a partir de uma `LinkSuggestion` aprovada — vem da URL (`?titulo=...&url=...`). */
  prefill?: { titulo?: string; url?: string; descricao?: string };
}

export function LinkForm({ action, link, prefill }: LinkFormProps) {
  const [state, formAction] = useActionState<LinkActionState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor="titulo">
        <Input
          id="titulo"
          name="titulo"
          required
          maxLength={150}
          defaultValue={link?.titulo ?? prefill?.titulo}
        />
      </FormField>
      <FormField label="Link (URL)" htmlFor="url">
        <Input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://…"
          defaultValue={link?.url ?? prefill?.url}
        />
      </FormField>
      <FormField label="Descrição (opcional)" htmlFor="descricao">
        <Textarea
          id="descricao"
          name="descricao"
          rows={2}
          maxLength={300}
          defaultValue={link?.descricao ?? prefill?.descricao ?? ''}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Categoria" htmlFor="categoria">
          <Select id="categoria" name="categoria" defaultValue={link?.categoria ?? 'institucional'}>
            {LINK_CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {LINK_CATEGORY_LABELS[key]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Tipo de acesso" htmlFor="tipoAcesso">
          <Select id="tipoAcesso" name="tipoAcesso" defaultValue={link?.tipoAcesso ?? 'externo'}>
            {LINK_ACCESS_TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {LINK_ACCESS_TYPE_LABELS[key]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField
        label="Ordem"
        htmlFor="ordem"
        description="Menor número aparece primeiro na listagem. Também dá pra reordenar pelos botões ▲▼ na lista."
      >
        <Input id="ordem" name="ordem" type="number" min={0} defaultValue={link?.ordem ?? 0} />
      </FormField>
      <label className="flex items-center gap-2.5 text-sm">
        <Switch name="destaque" defaultChecked={link?.destaque ?? false} />
        Mostrar em &quot;Acessos em destaque&quot;
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
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
