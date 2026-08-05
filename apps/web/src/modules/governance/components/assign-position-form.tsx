'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { BOARD_POSITION_KEYS, BOARD_POSITION_LABELS } from '@vl6/shared';
import type { Member } from '@vl6/domain';
import { Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  assignBoardPositionAction,
  type GovernanceActionState,
} from '../actions/governance-actions';

export function AssignPositionForm({ gestaoId, members }: { gestaoId: string; members: Member[] }) {
  const boundAction = assignBoardPositionAction.bind(null, gestaoId);
  const [state, formAction] = useActionState<GovernanceActionState, FormData>(boundAction, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Cargo" htmlFor="cargo">
        <Select id="cargo" name="cargo" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {BOARD_POSITION_KEYS.map((cargo) => (
            <option key={cargo} value={cargo}>
              {BOARD_POSITION_LABELS[cargo]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Irmão" htmlFor="memberId">
        <Select id="memberId" name="memberId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.nomeCompleto}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        label="Ordem"
        htmlFor="ordem"
        description="Usado para diferenciar 1º/2º Diácono, 1º/2º Experto etc."
      >
        <Input id="ordem" name="ordem" type="number" min={1} defaultValue={1} />
      </FormField>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Atribuindo…' : 'Atribuir'}
    </Button>
  );
}
