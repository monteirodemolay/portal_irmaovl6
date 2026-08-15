'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { UnclaimedMember } from '@vl6/domain';
import { Button, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { claimMemberAccountAction, type ClaimActionState } from '../actions/claim-actions';

const EMPTY_STATE: ClaimActionState = { error: null };

export function ClaimAccountForm({ unclaimedMembers }: { unclaimedMembers: UnclaimedMember[] }) {
  const [state, formAction] = useActionState<ClaimActionState, FormData>(
    claimMemberAccountAction,
    EMPTY_STATE,
  );
  // Todos os campos controlados de propósito: depois de uma tentativa que
  // falha (ex.: CIM errada), `useActionState` reseta os campos não
  // controlados do <form> pro valor inicial — com campos controlados, o
  // React reafirma o valor guardado aqui a cada render, então uma nova
  // tentativa não obriga a pessoa a preencher tudo de novo do zero.
  const [memberId, setMemberId] = useState('');
  const [cim, setCim] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  if (unclaimedMembers.length === 0) {
    return (
      <p className="text-muted text-center text-sm">
        Não há cadastros pendentes de reivindicação no momento. Se você já tem acesso, entre pelo
        login; caso contrário, fale com a Secretaria.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Seu nome" htmlFor="memberId">
        <Select
          id="memberId"
          name="memberId"
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
        >
          <option value="">Selecione seu nome</option>
          {unclaimedMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.nomeCompleto}
            </option>
          ))}
        </Select>
      </FormField>

      {memberId && (
        <>
          <FormField
            label="CIM"
            htmlFor="cim"
            description="Confirma que o cadastro é realmente seu."
          >
            <Input id="cim" name="cim" value={cim} onChange={(e) => setCim(e.target.value)} />
          </FormField>
          <FormField label="E-mail" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Senha" htmlFor="senha" description="Pelo menos 6 caracteres.">
            <Input
              id="senha"
              name="senha"
              type="password"
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </FormField>
          <FormField label="Confirmar senha" htmlFor="confirmarSenha">
            <Input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              minLength={6}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </FormField>
        </>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {memberId && <SubmitButton />}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Criando acesso…' : 'Criar meu acesso'}
    </Button>
  );
}
