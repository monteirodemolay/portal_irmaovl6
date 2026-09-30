'use client';

import type { Member, PublicationSettings } from '@vl6/domain';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';
import { ContactsCard } from '@/modules/membership/components/profile-fields/contacts-card';

export function ContatosTab({
  member,
  settings: _settings,
}: {
  member: Member;
  settings: PublicationSettings | null;
}) {
  return <ContactsCard member={member} action={updateMyProfileAction} />;
}
