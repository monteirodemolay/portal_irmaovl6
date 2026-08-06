'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  requestDomainVerificationAction,
  verifyDomainAction,
  type DomainVerificationActionState,
} from '../actions/domain-verification-actions';

const EMPTY_STATE: DomainVerificationActionState = {
  error: null,
  domain: null,
  token: null,
  verified: false,
};

export function DomainVerificationPanel({ currentDomain }: { currentDomain: string | null }) {
  const [requestState, requestAction] = useActionState(
    requestDomainVerificationAction,
    EMPTY_STATE,
  );
  const [verifyState, verifyAction] = useActionState(verifyDomainAction, EMPTY_STATE);

  // Depois do primeiro clique em "Verificar agora", o estado da verificação
  // manda — antes disso, o da solicitação (que já traz domínio/token).
  const active = verifyState.domain ? verifyState : requestState;

  if (currentDomain && !active.domain) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p>
          Domínio ativo: <strong className="font-mono">{currentDomain}</strong>
        </p>
        <p className="text-muted text-xs">
          Pra trocar de domínio, solicite a verificação de um novo abaixo — o atual continua ativo
          até o novo ser verificado.
        </p>
        <RequestForm requestAction={requestAction} />
      </div>
    );
  }

  if (active.domain && !active.verified) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <div className="border-border bg-background flex flex-col gap-2 rounded border p-4">
          <p>
            Adicione este registro TXT no DNS do domínio{' '}
            <strong className="font-mono">{active.domain}</strong>:
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
            <dt className="text-muted">Nome</dt>
            <dd>_vl6-verify.{active.domain}</dd>
            <dt className="text-muted">Tipo</dt>
            <dd>TXT</dd>
            <dt className="text-muted">Valor</dt>
            <dd>{active.token}</dd>
          </dl>
          <p className="text-muted text-xs">
            Propagação de DNS pode levar até 24h. Depois de adicionar o registro, clique em
            verificar.
          </p>
        </div>
        {active.error && <p className="text-sm text-red-600">{active.error}</p>}
        <form action={verifyAction} className="w-fit">
          <input type="hidden" name="domain" value={active.domain} />
          <VerifySubmitButton />
        </form>
      </div>
    );
  }

  if (active.verified) {
    return (
      <p className="border-accent/40 bg-accent/10 rounded border p-3 text-sm">
        Domínio <strong className="font-mono">{active.domain}</strong> verificado e ativo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted text-xs">Nenhum domínio próprio configurado ainda.</p>
      <RequestForm requestAction={requestAction} />
    </div>
  );
}

function RequestForm({ requestAction }: { requestAction: (formData: FormData) => void }) {
  return (
    <form action={requestAction} className="flex flex-col gap-3">
      <FormField
        label="Domínio próprio"
        htmlFor="domain"
        description="Ex.: minhaloja.com.br — sem http:// nem www."
      >
        <Input id="domain" name="domain" placeholder="minhaloja.com.br" required />
      </FormField>
      <RequestSubmitButton />
    </form>
  );
}

function RequestSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? 'Gerando…' : 'Solicitar verificação'}
    </Button>
  );
}

function VerifySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? 'Verificando…' : 'Verificar agora'}
    </Button>
  );
}
