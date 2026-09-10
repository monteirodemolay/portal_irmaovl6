'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Button, Heart, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import type { ProfileFieldAction, ProfileFieldActionState } from '../profile-fields/action-state';

/**
 * Mensagem de homenagem da página In Memoriam — exclusivo da edição
 * administrativa, só renderizado quando `member.situacao === 'falecido'`
 * (`MemberEditPanel`). Nunca editável pelo próprio Irmão.
 */
export function MemberMemorialCard({
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
    <FormSectionCard
      icon={Heart}
      title="In Memoriam"
      description="Mensagem de homenagem exibida no perfil público deste Irmão — só o Administrador edita."
    >
      <form action={formAction} className="flex flex-col gap-4">
        <FormField label="Mensagem de homenagem" htmlFor="mensagemHomenagem">
          <Textarea
            id="mensagemHomenagem"
            name="mensagemHomenagem"
            rows={5}
            maxLength={4000}
            defaultValue={member.mensagemHomenagem ?? ''}
            placeholder="Um texto em memória deste Irmão, para a comunidade VL6."
          />
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
