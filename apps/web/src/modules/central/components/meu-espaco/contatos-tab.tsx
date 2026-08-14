'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member, PublicationSettings } from '@vl6/domain';
import { Button, Input, Mail, MessageCircle, Phone } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import {
  updateMyProfileAction,
  type SelfProfileActionState,
} from '@/modules/membership/actions/self-profile-actions';
import { VisibilityMiniForm } from './visibility-mini-form';

export function ContatosTab({
  member,
  settings,
}: {
  member: Member;
  settings: PublicationSettings | null;
}) {
  const [selfState, selfAction] = useActionState<SelfProfileActionState, FormData>(
    updateMyProfileAction,
    { error: null },
  );

  return (
    <div className="flex flex-col gap-4">
      <FormSectionCard icon={Phone} title="Contatos">
        <form action={selfAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Telefone" htmlFor="telefone">
              <Input id="telefone" name="telefone" defaultValue={member.telefone ?? ''} />
            </FormField>
            <FormField label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" defaultValue={member.whatsapp ?? ''} />
            </FormField>
          </div>
          <FormField label="E-mail" htmlFor="email" description="Vinculado à sua conta de acesso.">
            <Input id="email" value={member.email} disabled />
          </FormField>
          {selfState.error && <p className="text-sm text-red-600">{selfState.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>

      <FormSectionCard
        icon={Phone}
        title="Visibilidade dos contatos"
        description="Cada contato é exibido de forma independente aos demais Irmãos."
        contentClassName="pt-1"
      >
        <VisibilityMiniForm
          group="contacts"
          items={[
            {
              key: 'telefone',
              label: 'Telefone',
              icon: Phone,
              defaultChecked: settings?.contacts.telefone ?? false,
            },
            {
              key: 'whatsapp',
              label: 'WhatsApp',
              icon: MessageCircle,
              defaultChecked: settings?.contacts.whatsapp ?? false,
            },
            {
              key: 'email',
              label: 'E-mail',
              icon: Mail,
              defaultChecked: settings?.contacts.email ?? false,
            },
          ]}
        />
      </FormSectionCard>
    </div>
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
