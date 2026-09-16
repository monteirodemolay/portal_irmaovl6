'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { UnclaimedMember } from '@vl6/domain';
import { Button, Eye, EyeOff, Input, Select } from '@vl6/ui';
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
  // Mostra a senha em texto por padrão: pra quem tem mais dificuldade de
  // digitar sem ver o que escreveu, é mais fácil conferir o campo do que
  // digitar duas vezes um valor escondido — por isso nenhum campo de
  // "confirmar senha" aqui, só este alternador.
  const [showSenha, setShowSenha] = useState(true);

  if (unclaimedMembers.length === 0) {
    return (
      <p className="text-muted text-center text-sm">
        Não há cadastros pendentes de reivindicação no momento. Se você já tem acesso, entre pelo
        login; caso contrário, fale com a Secretaria.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormField label="Seu nome" htmlFor="memberId">
        <Select
          id="memberId"
          name="memberId"
          className="h-12 text-base"
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
          <FormField label="Sua CIM" htmlFor="cim" description="O número que confirma que é você.">
            <Input
              id="cim"
              name="cim"
              inputMode="numeric"
              className="h-12 text-base"
              value={cim}
              onChange={(e) => setCim(e.target.value)}
            />
          </FormField>
          <FormField
            label="Seu e-mail"
            htmlFor="email"
            description="É com ele que você vai entrar no Portal."
          >
            <Input
              id="email"
              name="email"
              type="email"
              className="h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField
            label="Crie uma senha"
            htmlFor="senha"
            description="Pelo menos 6 letras ou números — pode ser algo fácil de lembrar."
          >
            <div className="relative">
              <Input
                id="senha"
                name="senha"
                type={showSenha ? 'text' : 'password'}
                minLength={6}
                className="h-12 pr-12 text-base"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowSenha((value) => !value)}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="text-muted hover:bg-background hover:text-foreground absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
              >
                {showSenha ? (
                  <EyeOff size={18} strokeWidth={1.7} />
                ) : (
                  <Eye size={18} strokeWidth={1.7} />
                )}
              </button>
            </div>
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
    <Button type="submit" disabled={pending} className="h-12 w-full text-base">
      {pending ? 'Criando seu acesso…' : 'Entrar no Portal'}
    </Button>
  );
}
