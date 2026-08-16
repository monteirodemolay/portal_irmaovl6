'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ARCHIVE_RELATION_TYPE_KEYS, ARCHIVE_RELATION_TYPE_LABELS } from '@vl6/shared';
import { Button, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createArchiveRelationAction,
  type CreateArchiveRelationState,
} from '../actions/archive-actions';
import type { RelationNodeOption } from '../lib/load-relation-node-options';

const EMPTY_STATE: CreateArchiveRelationState = { error: null };

export interface ArchiveRelationFormGroup {
  tipo: string;
  label: string;
  items: RelationNodeOption[];
}

function NodeSelect({
  id,
  name,
  groups,
}: {
  id: string;
  name: string;
  groups: ArchiveRelationFormGroup[];
}) {
  return (
    <Select id={id} name={name} required defaultValue="">
      <option value="" disabled>
        Selecione…
      </option>
      {groups.map((group) => (
        <optgroup key={group.tipo} label={group.label}>
          {group.items.map((item) => (
            <option key={`${item.tipo}|${item.id}`} value={`${item.tipo}|${item.id}`}>
              {item.label}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

export function ArchiveRelationForm({ groups }: { groups: ArchiveRelationFormGroup[] }) {
  const [state, formAction] = useActionState(createArchiveRelationAction, EMPTY_STATE);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label="Origem" htmlFor="origem">
        <NodeSelect id="origem" name="origem" groups={groups} />
      </FormField>
      <FormField label="Tipo de relação" htmlFor="tipo">
        <Select id="tipo" name="tipo" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {ARCHIVE_RELATION_TYPE_KEYS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ARCHIVE_RELATION_TYPE_LABELS[tipo]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Destino" htmlFor="destino">
        <NodeSelect id="destino" name="destino" groups={groups} />
      </FormField>
      <FormField label="Observação (opcional)" htmlFor="descricao">
        <Textarea id="descricao" name="descricao" rows={3} />
      </FormField>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar relação'}
    </Button>
  );
}
