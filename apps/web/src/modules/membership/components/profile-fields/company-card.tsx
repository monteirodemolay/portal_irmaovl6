'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import { Building2, Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import type { ProfileFieldAction, ProfileFieldActionState } from './action-state';

/**
 * Só `Member.empresa` (empresa atual) — a lista de "Empresas e negócios"
 * é da Central, exclusiva do autoatendimento, e fica fora deste cartão.
 * Mesmo componente usado no Meu Espaço e na edição administrativa de
 * qualquer Irmão.
 *
 * `knownCompanies` alimenta um `<datalist>` (autocomplete nativo do
 * navegador, sem JS extra) com as empresas que outros Irmãos já
 * cadastraram — digitar "cia" já sugere "Cia X" se alguém já usou esse
 * nome, reduzindo variações do mesmo item no Diretório. Continua sendo um
 * campo de texto livre: sugerir não é obrigar.
 */
export function CompanyCard({
  member,
  action,
  knownCompanies = [],
}: {
  member: Member;
  action: ProfileFieldAction;
  knownCompanies?: string[];
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });

  return (
    <FormSectionCard icon={Building2} title="Empresa atual">
      <form action={formAction} className="flex flex-col gap-4">
        <FormField label="Empresa" htmlFor="empresa">
          <Input
            id="empresa"
            name="empresa"
            list="empresas-cadastradas"
            defaultValue={member.empresa ?? ''}
          />
          <datalist id="empresas-cadastradas">
            {knownCompanies.map((company) => (
              <option key={company} value={company} />
            ))}
          </datalist>
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
