'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Button, Input, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { updateMyProfileAction } from '../actions/self-profile-actions';
import type { MemberActionState } from '../actions/member-actions';

export function SelfProfileForm({ member }: { member: Member }) {
  const [state, formAction] = useActionState<MemberActionState, FormData>(updateMyProfileAction, {
    error: null,
  });

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
          <Input id="profissao" name="profissao" defaultValue={member.profissao ?? ''} />
        </FormField>
        <FormField label="Empresa" htmlFor="empresa">
          <Input id="empresa" name="empresa" defaultValue={member.empresa ?? ''} />
        </FormField>
        <FormField label="Estado civil" htmlFor="estadoCivil">
          <Input id="estadoCivil" name="estadoCivil" defaultValue={member.estadoCivil ?? ''} />
        </FormField>
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
