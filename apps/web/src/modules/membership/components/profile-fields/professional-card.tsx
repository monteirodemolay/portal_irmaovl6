'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Briefcase, Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { COMMON_PROFESSIONS, OTHER_PROFESSION_VALUE } from '@/lib/membership/professions';
import type { ProfileFieldAction, ProfileFieldActionState } from './action-state';

/**
 * Só `Member.profissao` — o conteúdo de área de atuação/formação/resumo é
 * da Central (`MemberCentralProfile`), exclusivo do autoatendimento, e fica
 * fora deste cartão. Mesmo componente usado no Meu Espaço e na edição
 * administrativa de qualquer Irmão.
 */
export function ProfessionalCard({
  member,
  action,
  customProfessions = [],
}: {
  member: Member;
  action: ProfileFieldAction;
  customProfessions?: string[];
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });

  const professionOptions = [...COMMON_PROFESSIONS, ...customProfessions];
  const initialProfissaoSelect = member.profissao
    ? professionOptions.includes(member.profissao)
      ? member.profissao
      : OTHER_PROFESSION_VALUE
    : '';
  const [profissaoSelect, setProfissaoSelect] = useState(initialProfissaoSelect);

  return (
    <FormSectionCard icon={Briefcase} title="Profissão">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                defaultValue={
                  member.profissao && !professionOptions.includes(member.profissao)
                    ? member.profissao
                    : ''
                }
              />
            </FormField>
          )}
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
