'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member, MemberCentralProfile } from '@vl6/domain';
import { Button, Input, MapPin, UserCircle } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';
import { AddressMaritalCard } from '@/modules/membership/components/profile-fields/address-marital-card';

export function PessoalTab({
  member,
  profile,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
}) {
  const [contentState, contentAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );

  return (
    <div className="flex flex-col gap-4">
      <FormSectionCard
        icon={UserCircle}
        title="Informações pessoais compartilhadas"
        description="Aparecem no seu perfil da Central quando este bloco estiver publicado."
      >
        <form action={contentAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Interesses" htmlFor="interesses">
              <Input id="interesses" name="interesses" defaultValue={profile?.interesses ?? ''} />
            </FormField>
            <FormField label="Cidade" htmlFor="cidadeExibicao">
              <Input
                id="cidadeExibicao"
                name="cidadeExibicao"
                defaultValue={profile?.cidadeExibicao ?? ''}
              />
            </FormField>
          </div>
          {contentState.error && <p className="text-sm text-red-600">{contentState.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>

      <AddressMaritalCard member={member} action={updateMyProfileAction} />

      <p className="text-muted flex items-center gap-1.5 text-xs">
        <MapPin size={12} /> Endereço e estado civil nunca aparecem na Central — são só para a
        administração da Loja.
      </p>
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
