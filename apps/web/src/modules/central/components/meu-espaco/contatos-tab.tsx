'use client';

import type { Member, PublicationSettings } from '@vl6/domain';
import { Mail, MessageCircle, Phone } from '@vl6/ui';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';
import { ContactsCard } from '@/modules/membership/components/profile-fields/contacts-card';
import { VisibilityMiniForm } from './visibility-mini-form';

export function ContatosTab({
  member,
  settings,
}: {
  member: Member;
  settings: PublicationSettings | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ContactsCard member={member} action={updateMyProfileAction} />

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
