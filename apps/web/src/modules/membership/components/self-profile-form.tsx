'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MARITAL_STATUSES, type MaritalStatus } from '@vl6/shared';
import type { Member } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  MARITAL_STATUS_LABELS,
  maritalStatusHasSpouse,
} from '@/lib/membership/marital-status-label';
import { COMMON_PROFESSIONS, OTHER_PROFESSION_VALUE } from '@/lib/membership/professions';
import {
  updateMyProfileAction,
  type SelfProfileActionState,
} from '../actions/self-profile-actions';

function toDateInputValue(date: Date | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}

export function SelfProfileForm({
  member,
  customProfessions = [],
}: {
  member: Member;
  customProfessions?: string[];
}) {
  const [state, formAction] = useActionState<SelfProfileActionState, FormData>(
    updateMyProfileAction,
    { error: null },
  );
  const [estadoCivil, setEstadoCivil] = useState<MaritalStatus | ''>(member.estadoCivil ?? '');

  const professionOptions = [...COMMON_PROFESSIONS, ...customProfessions];
  const initialProfissaoSelect = member.profissao
    ? professionOptions.includes(member.profissao)
      ? member.profissao
      : OTHER_PROFESSION_VALUE
    : '';
  const [profissaoSelect, setProfissaoSelect] = useState(initialProfissaoSelect);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nome maçônico" htmlFor="nomeMaconico">
          <Input id="nomeMaconico" name="nomeMaconico" defaultValue={member.nomeMaconico ?? ''} />
        </FormField>
        <FormField label="Telefone" htmlFor="telefone">
          <Input id="telefone" name="telefone" defaultValue={member.telefone ?? ''} />
        </FormField>
        <FormField label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" defaultValue={member.whatsapp ?? ''} />
        </FormField>
        <FormField label="Profissão" htmlFor="profissao">
          <Select
            id="profissao"
            name="profissao"
            value={profissaoSelect}
            onChange={(event) => setProfissaoSelect(event.target.value)}
          >
            <option value="">Selecione</option>
            {professionOptions.map((profissao) => (
              <option key={profissao} value={profissao}>
                {profissao}
              </option>
            ))}
            <option value={OTHER_PROFESSION_VALUE}>Outra</option>
          </Select>
        </FormField>
        {profissaoSelect === OTHER_PROFESSION_VALUE && (
          <FormField label="Qual profissão?" htmlFor="profissaoOutra">
            <Input
              id="profissaoOutra"
              name="profissaoOutra"
              required
              defaultValue={
                member.profissao && !professionOptions.includes(member.profissao)
                  ? member.profissao
                  : ''
              }
            />
          </FormField>
        )}
        <FormField label="Empresa" htmlFor="empresa">
          <Input id="empresa" name="empresa" defaultValue={member.empresa ?? ''} />
        </FormField>
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
              <Input id="conjugeNome" name="conjugeNome" defaultValue={member.conjugeNome ?? ''} />
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

      <div className="grid grid-cols-3 gap-4">
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

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Instagram" htmlFor="instagram">
          <Input
            id="instagram"
            name="instagram"
            defaultValue={member.redesSociais.instagram ?? ''}
          />
        </FormField>
        <FormField label="Facebook" htmlFor="facebook">
          <Input id="facebook" name="facebook" defaultValue={member.redesSociais.facebook ?? ''} />
        </FormField>
        <FormField label="LinkedIn" htmlFor="linkedin">
          <Input id="linkedin" name="linkedin" defaultValue={member.redesSociais.linkedin ?? ''} />
        </FormField>
      </div>

      <FormField label="Biografia" htmlFor="biografia">
        <Textarea id="biografia" name="biografia" defaultValue={member.biografia ?? ''} />
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
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
