'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Button, Input, NotebookText, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import type { ProfileFieldAction, ProfileFieldActionState } from '../profile-fields/action-state';

/**
 * Biografia, observações internas e redes sociais legadas — exclusivo da
 * edição administrativa; nenhuma tela de autoatendimento os edita hoje.
 */
export function MemberNotesCard({
  member,
  action,
}: {
  member: Member;
  action: ProfileFieldAction;
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });

  return (
    <FormSectionCard icon={NotebookText} title="Biografia, redes e observações">
      <form action={formAction} className="flex flex-col gap-4">
        <FormField label="Biografia" htmlFor="biografia">
          <Textarea id="biografia" name="biografia" defaultValue={member.biografia ?? ''} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Instagram" htmlFor="instagram">
            <Input
              id="instagram"
              name="instagram"
              defaultValue={member.redesSociais.instagram ?? ''}
            />
          </FormField>
          <FormField label="Facebook" htmlFor="facebook">
            <Input
              id="facebook"
              name="facebook"
              defaultValue={member.redesSociais.facebook ?? ''}
            />
          </FormField>
          <FormField label="LinkedIn" htmlFor="linkedin">
            <Input
              id="linkedin"
              name="linkedin"
              defaultValue={member.redesSociais.linkedin ?? ''}
            />
          </FormField>
        </div>
        <FormField label="Observações" htmlFor="observacoes">
          <Textarea id="observacoes" name="observacoes" defaultValue={member.observacoes ?? ''} />
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
