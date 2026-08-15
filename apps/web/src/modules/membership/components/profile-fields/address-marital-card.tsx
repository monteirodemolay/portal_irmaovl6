'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MARITAL_STATUSES, type MaritalStatus } from '@vl6/shared';
import type { Member } from '@vl6/domain';
import { Button, Heart, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import {
  MARITAL_STATUS_LABELS,
  maritalStatusHasSpouse,
} from '@/lib/membership/marital-status-label';
import type { ProfileFieldAction, ProfileFieldActionState } from './action-state';

function toDateInputValue(date: Date | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}

/**
 * Endereço + estado civil/cônjuge — mesmo componente usado no Meu Espaço
 * (autoatendimento) e na edição administrativa de qualquer Irmão; só a
 * `action` já vinculada pelo chamador muda entre os dois.
 */
export function AddressMaritalCard({
  member,
  action,
}: {
  member: Member;
  action: ProfileFieldAction;
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });
  const [estadoCivil, setEstadoCivil] = useState<MaritalStatus | ''>(member.estadoCivil ?? '');

  return (
    <FormSectionCard
      icon={Heart}
      title="Estado civil e endereço"
      description="Uso interno da Secretaria — nunca aparece no Diretório."
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Estado civil" htmlFor="estadoCivil">
            <Select
              id="estadoCivil"
              name="estadoCivil"
              value={estadoCivil}
              onChange={(event) => setEstadoCivil(event.target.value as MaritalStatus)}
            >
              <option value="">Selecione</option>
              {MARITAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MARITAL_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </FormField>
          {maritalStatusHasSpouse(estadoCivil || null) && (
            <>
              <FormField label="Nome da cônjuge" htmlFor="conjugeNome">
                <Input
                  id="conjugeNome"
                  name="conjugeNome"
                  defaultValue={member.conjugeNome ?? ''}
                />
              </FormField>
              <FormField label="Data de nascimento da cônjuge" htmlFor="conjugeDataNascimento">
                <Input
                  id="conjugeDataNascimento"
                  name="conjugeDataNascimento"
                  type="date"
                  defaultValue={toDateInputValue(member.conjugeDataNascimento)}
                />
              </FormField>
            </>
          )}
        </div>

        <div className="border-border-soft grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="CEP" htmlFor="cep">
            <Input id="cep" name="cep" defaultValue={member.endereco?.cep ?? ''} />
          </FormField>
          <FormField label="Logradouro" htmlFor="logradouro">
            <Input
              id="logradouro"
              name="logradouro"
              defaultValue={member.endereco?.logradouro ?? ''}
            />
          </FormField>
          <FormField label="Número" htmlFor="enderecoNumero">
            <Input
              id="enderecoNumero"
              name="enderecoNumero"
              defaultValue={member.endereco?.numero ?? ''}
            />
          </FormField>
          <FormField label="Bairro" htmlFor="bairro">
            <Input id="bairro" name="bairro" defaultValue={member.endereco?.bairro ?? ''} />
          </FormField>
          <FormField label="Cidade" htmlFor="cidade">
            <Input id="cidade" name="cidade" defaultValue={member.endereco?.cidade ?? ''} />
          </FormField>
          <FormField label="Estado" htmlFor="estado">
            <Input
              id="estado"
              name="estado"
              maxLength={2}
              defaultValue={member.endereco?.estado ?? ''}
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
