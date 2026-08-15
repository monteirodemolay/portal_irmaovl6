'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MEMBER_DEGREES } from '@vl6/shared';
import type { Member } from '@vl6/domain';
import { Button, Compass, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import type { ProfileFieldAction, ProfileFieldActionState } from '../profile-fields/action-state';

function toDateInputValue(date: Date | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}

/** CIM, grau e datas maçônicas — exclusivo da edição administrativa. */
export function MemberMasonicDataCard({
  member,
  action,
}: {
  member: Member;
  action: ProfileFieldAction;
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });
  const [grau, setGrau] = useState(member.grau);

  return (
    <FormSectionCard
      icon={Compass}
      title="Dados maçônicos"
      description="Opcional — pode ser preenchido depois, quando você tiver os dados em mãos."
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="CIM" htmlFor="cim">
            <Input id="cim" name="cim" defaultValue={member.cim ?? ''} />
          </FormField>
          <FormField label="Grau" htmlFor="grau">
            <Select
              id="grau"
              name="grau"
              required
              value={grau}
              onChange={(event) => setGrau(event.target.value as typeof grau)}
            >
              {MEMBER_DEGREES.map((degree) => (
                <option key={degree} value={degree}>
                  {MEMBER_DEGREE_LABELS[degree]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data de nascimento" htmlFor="dataNascimento">
            <Input
              id="dataNascimento"
              name="dataNascimento"
              type="date"
              defaultValue={toDateInputValue(member.dataNascimento)}
            />
          </FormField>
          <FormField label="Data de iniciação" htmlFor="dataIniciacao">
            <Input
              id="dataIniciacao"
              name="dataIniciacao"
              type="date"
              defaultValue={toDateInputValue(member.dataIniciacao)}
            />
          </FormField>
          <FormField label="Data de elevação" htmlFor="dataElevacao">
            <Input
              id="dataElevacao"
              name="dataElevacao"
              type="date"
              defaultValue={toDateInputValue(member.dataElevacao)}
            />
          </FormField>
          <FormField label="Data de exaltação" htmlFor="dataExaltacao">
            <Input
              id="dataExaltacao"
              name="dataExaltacao"
              type="date"
              defaultValue={toDateInputValue(member.dataExaltacao)}
            />
          </FormField>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>
    </FormSectionCard>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="w-fit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
