'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Button, IdCard, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { MemberAvatar } from '@/components/membership/member-avatar';
import type { ProfileFieldAction, ProfileFieldActionState } from '../profile-fields/action-state';

/** Identificação — nome, e-mail e foto — exclusivo da edição administrativa. */
export function MemberIdentityCard({
  member,
  action,
}: {
  member: Member;
  action: ProfileFieldAction;
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <FormSectionCard icon={IdCard} title="Identificação">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <MemberAvatar
            fotoUrl={preview ?? member.fotoUrl}
            nome={member.nomeCompleto}
            className="h-16 w-16"
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="foto"
              className="text-primary w-fit cursor-pointer text-sm font-medium hover:underline"
            >
              {member.fotoUrl ? 'Alterar foto' : 'Selecionar foto'}
            </label>
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <p className="text-muted text-xs">JPG, PNG ou WEBP — até 5 MB.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nome completo" htmlFor="nomeCompleto">
            <Input
              id="nomeCompleto"
              name="nomeCompleto"
              required
              defaultValue={member.nomeCompleto}
            />
          </FormField>
          <FormField label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={member.email ?? ''} />
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
