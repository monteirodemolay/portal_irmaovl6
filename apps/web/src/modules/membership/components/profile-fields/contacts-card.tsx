'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Button, Input, Phone } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import type { ProfileFieldAction, ProfileFieldActionState } from './action-state';

/**
 * Telefone + WhatsApp (editáveis) + e-mail (somente leitura, vinculado à
 * conta de acesso — editável só pelo Admin no cartão de Identificação). A
 * visibilidade de cada contato no Diretório é da Central, exclusiva do
 * autoatendimento, e fica fora deste cartão. Mesmo componente usado no Meu
 * Espaço e na edição administrativa de qualquer Irmão.
 */
export function ContactsCard({ member, action }: { member: Member; action: ProfileFieldAction }) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });

  return (
    <FormSectionCard icon={Phone} title="Contatos">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Telefone" htmlFor="telefone">
            <Input id="telefone" name="telefone" defaultValue={member.telefone ?? ''} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" defaultValue={member.whatsapp ?? ''} />
          </FormField>
        </div>
        <FormField label="E-mail" htmlFor="email" description="Vinculado à conta de acesso.">
          <Input id="email" value={member.email} disabled />
        </FormField>
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
