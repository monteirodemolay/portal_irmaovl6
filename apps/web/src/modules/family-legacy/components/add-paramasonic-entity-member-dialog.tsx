'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS,
  PARAMASONIC_ENTITY_MEMBER_SITUATIONS,
} from '@vl6/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Plus,
  Select,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  addParamasonicEntityMemberAction,
  type ParamasonicEntityActionState,
} from '../actions/paramasonic-entity-actions';

export interface MemberOption {
  id: string;
  nomeCompleto: string;
}

export function AddParamasonicEntityMemberDialog({
  entityId,
  allowLinkingMember,
  memberOptions,
}: {
  entityId: string;
  /** `false` pra Fraternidade Feminina — só tem corpo próprio, nunca Irmão vinculado. */
  allowLinkingMember: boolean;
  memberOptions: MemberOption[];
}) {
  const boundAction = addParamasonicEntityMemberAction.bind(null, entityId);
  const [state, formAction] = useActionState<ParamasonicEntityActionState, FormData>(boundAction, {
    error: null,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [linkMember, setLinkMember] = useState(false);

  useEffect(() => {
    if (state.error === null) {
      formRef.current?.reset();
      setLinkMember(false);
    }
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} />
          Adicionar integrante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar integrante</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          {allowLinkingMember && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={linkMember}
                onChange={(e) => setLinkMember(e.target.checked)}
              />
              É um Irmão cadastrado que ocupou/ocupa cargo nesta entidade
            </label>
          )}

          {linkMember ? (
            <FormField label="Irmão" htmlFor="memberId">
              <Select id="memberId" name="memberId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nomeCompleto}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <>
              <FormField label="Nome completo" htmlFor="nomeCompleto">
                <Input id="nomeCompleto" name="nomeCompleto" required />
              </FormField>
              <FormField
                label="Contato"
                htmlFor="contato"
                description="Opcional — e-mail ou telefone."
              >
                <Input id="contato" name="contato" />
              </FormField>
            </>
          )}

          <FormField
            label="Cargo"
            htmlFor="cargo"
            description="Opcional, texto livre — ex.: Presidência, Secretaria."
          >
            <Input id="cargo" name="cargo" />
          </FormField>
          <FormField label="Situação" htmlFor="situacao">
            <Select id="situacao" name="situacao" required defaultValue="ativo">
              {PARAMASONIC_ENTITY_MEMBER_SITUATIONS.map((situacao) => (
                <option key={situacao} value={situacao}>
                  {PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS[situacao]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data de ingresso" htmlFor="dataIngresso" description="Opcional.">
            <Input id="dataIngresso" name="dataIngresso" type="date" />
          </FormField>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Adicionando…' : 'Adicionar'}
    </Button>
  );
}
