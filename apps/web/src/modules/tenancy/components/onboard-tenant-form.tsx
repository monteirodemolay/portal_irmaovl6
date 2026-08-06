'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { TENANT_MODULE_KEYS, TENANT_MODULE_LABELS } from '@vl6/shared';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  onboardTenantAction,
  type OnboardTenantActionState,
} from '../actions/onboard-tenant-action';

const INITIAL_STATE: OnboardTenantActionState = {
  error: null,
  tenantNome: null,
  adminEmail: null,
  temporaryPassword: null,
};

export function OnboardTenantForm() {
  const [state, formAction] = useActionState<OnboardTenantActionState, FormData>(
    onboardTenantAction,
    INITIAL_STATE,
  );

  if (state.temporaryPassword) {
    return (
      <div className="border-accent/40 bg-accent/10 flex flex-col gap-3 rounded border p-4 text-sm">
        <p>
          Loja <strong>{state.tenantNome}</strong> criada. Conta do Administrador:{' '}
          <strong>{state.adminEmail}</strong>
        </p>
        <p>
          Senha temporária:{' '}
          <strong className="font-mono" data-testid="temporary-password">
            {state.temporaryPassword}
          </strong>
        </p>
        <p className="text-muted text-xs">
          Repasse essas credenciais ao Administrador da Loja com segurança — essa senha não é
          mostrada novamente. Ele pode trocá-la a qualquer momento pelo fluxo de recuperação de
          senha.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display mb-1 text-sm font-semibold">Dados da Loja</legend>
        <FormField label="Nome" htmlFor="nome">
          <Input id="nome" name="nome" required minLength={3} maxLength={150} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número" htmlFor="numero">
            <Input id="numero" name="numero" required maxLength={10} />
          </FormField>
          <FormField label="Potência" htmlFor="potencia">
            <Input id="potencia" name="potencia" required maxLength={150} defaultValue="GLEG" />
          </FormField>
        </div>
        <FormField
          label="Subdomínio"
          htmlFor="subdominio"
          description="Ex.: minhaloja — vira minhaloja.portaldoirmao.app"
        >
          <Input id="subdominio" name="subdominio" required pattern="[a-z0-9-]+" minLength={2} />
        </FormField>
        <FormField
          label="Domínio próprio (opcional)"
          htmlFor="dominio"
          description="Preencha só se a Loja já tem um domínio configurado — ver Domínio customizado no painel"
        >
          <Input id="dominio" name="dominio" />
        </FormField>
        <FormField label="E-mail de contato da Loja" htmlFor="email">
          <Input id="email" name="email" type="email" required />
        </FormField>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-display mb-1 text-sm font-semibold">Módulos habilitados</legend>
        {TENANT_MODULE_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={`modulo_${key}`} defaultChecked />
            {TENANT_MODULE_LABELS[key]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-display mb-1 text-sm font-semibold">Primeiro Administrador</legend>
        <FormField
          label="E-mail do Administrador"
          htmlFor="adminEmail"
          description="Recebe uma senha temporária exibida na próxima tela — precisa ser diferente de contas já existentes no Firebase"
        >
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </FormField>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando Loja…' : 'Criar Loja'}
    </Button>
  );
}
