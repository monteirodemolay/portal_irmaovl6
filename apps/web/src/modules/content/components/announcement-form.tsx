'use client';

import { useId, useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Announcement } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ContentActionState } from '../actions/content-actions';

function toDateInputValue(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface AnnouncementFormProps {
  action: (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;
  announcement?: Announcement;
  initialTitle?: string;
  /** Rascunho sugerido para um aviso novo; ignorado ao editar. */
  initialDescription?: string;
  initialExpiration?: string;
}

export function AnnouncementForm({
  action,
  announcement,
  initialTitle,
  initialDescription,
  initialExpiration,
}: AnnouncementFormProps) {
  const formId = useId();
  const [notificationChoice, setNotificationChoice] = useState('');
  const [state, formAction] = useActionState<ContentActionState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Título" htmlFor={`${formId}-titulo`}>
        <Input
          id={`${formId}-titulo`}
          name="titulo"
          required
          defaultValue={announcement?.titulo ?? initialTitle}
        />
      </FormField>
      <FormField label="Descrição" htmlFor={`${formId}-descricao`}>
        <Textarea
          id={`${formId}-descricao`}
          name="descricao"
          required
          rows={4}
          defaultValue={announcement?.descricao ?? initialDescription}
        />
      </FormField>
      <FormField label="Prioridade" htmlFor={`${formId}-prioridade`}>
        <Select
          id={`${formId}-prioridade`}
          name="prioridade"
          defaultValue={announcement?.prioridade ?? 'media'}
        >
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </Select>
      </FormField>
      <FormField
        label="Data de expiração (opcional)"
        htmlFor={`${formId}-dataExpiracao`}
        description="O aviso deixa de aparecer para os Irmãos após essa data."
      >
        <Input
          id={`${formId}-dataExpiracao`}
          name="dataExpiracao"
          type="date"
          defaultValue={
            announcement ? toDateInputValue(announcement.dataExpiracao ?? null) : initialExpiration
          }
        />
      </FormField>
      <div className="border-border bg-background rounded-lg border p-4 text-sm">
        <p className="font-medium">Exibir na página inicial</p>
        <p className="text-muted mt-1 text-xs">
          Todo aviso publicado aparece na inicial enquanto estiver vigente, independentemente da
          notificação.
        </p>
      </div>
      <FormField
        label="Também incluir nas notificações dos Irmãos?"
        htmlFor={`${formId}-notificarIrmaos`}
        description="Escolha obrigatória em cada salvamento. Nenhuma opção vem marcada."
      >
        <Select
          id={`${formId}-notificarIrmaos`}
          name="notificarIrmaos"
          required
          value={notificationChoice}
          onChange={(event) => setNotificationChoice(event.target.value)}
        >
          <option value="" disabled>
            Selecione Sim ou Não
          </option>
          <option value="sim">Sim — publicar na inicial e notificar os Irmãos</option>
          <option value="nao">Não — publicar somente na inicial</option>
        </Select>
        {announcement && typeof announcement.notificarIrmaos === 'boolean' && (
          <p className="text-muted mt-1 text-xs">
            Escolha salva anteriormente: {announcement.notificarIrmaos ? 'Sim' : 'Não'}.
          </p>
        )}
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="destacar"
          className="h-4 w-4"
          defaultChecked={announcement?.destacar}
        />
        Destacar no topo (máximo 3 avisos destacados simultâneos)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requiresAcknowledgement"
          className="h-4 w-4"
          disabled={notificationChoice !== 'sim'}
          defaultChecked={announcement?.requiresAcknowledgement}
        />
        Exigir confirmação de ciência de cada Irmão na Central de Avisos
      </label>
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      )}
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
