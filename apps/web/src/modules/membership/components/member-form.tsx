'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { MEMBER_DEGREES } from '@vl6/shared';
import type { Member } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { MemberActionState } from '../actions/member-actions';

export interface MemberFormProps {
  action: (state: MemberActionState, formData: FormData) => Promise<MemberActionState>;
  member?: Member;
}

const DEGREE_LABELS: Record<(typeof MEMBER_DEGREES)[number], string> = {
  aprendiz: 'Aprendiz',
  companheiro: 'Companheiro',
  mestre: 'Mestre',
};

function toDateInputValue(date: Date | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}

export function MemberForm({ action, member }: MemberFormProps) {
  const [state, formAction] = useActionState<MemberActionState, FormData>(action, {
    error: null,
    memberId: null,
    temporaryPassword: null,
  });

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-8">
      {state.temporaryPassword && (
        <div className="border-accent/40 bg-accent/10 flex flex-col gap-2 rounded border p-4 text-sm">
          <p>
            Irmão cadastrado e acesso ao Portal criado. Usuário: e-mail do Irmão. Senha temporária —
            copie agora, ela não é mostrada de novo:
          </p>
          <p className="break-all rounded border bg-white/60 p-2 font-mono text-xs">
            {state.temporaryPassword}
          </p>
          {state.memberId && (
            <Link
              href={`/admin/irmaos/${state.memberId}`}
              className="text-accent w-fit text-sm font-medium hover:underline"
            >
              Ver cadastro do Irmão
            </Link>
          )}
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Identificação</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nome completo" htmlFor="nomeCompleto">
            <Input
              id="nomeCompleto"
              name="nomeCompleto"
              required
              defaultValue={member?.nomeCompleto}
            />
          </FormField>
          <FormField label="Nome maçônico" htmlFor="nomeMaconico">
            <Input
              id="nomeMaconico"
              name="nomeMaconico"
              defaultValue={member?.nomeMaconico ?? ''}
            />
          </FormField>
          <FormField label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" required defaultValue={member?.email} />
          </FormField>
          <FormField label="Telefone" htmlFor="telefone">
            <Input id="telefone" name="telefone" defaultValue={member?.telefone ?? ''} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" defaultValue={member?.whatsapp ?? ''} />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Endereço</h2>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="CEP" htmlFor="cep">
            <Input id="cep" name="cep" defaultValue={member?.endereco?.cep ?? ''} />
          </FormField>
          <FormField label="Logradouro" htmlFor="logradouro">
            <Input
              id="logradouro"
              name="logradouro"
              defaultValue={member?.endereco?.logradouro ?? ''}
            />
          </FormField>
          <FormField label="Número" htmlFor="enderecoNumero">
            <Input
              id="enderecoNumero"
              name="enderecoNumero"
              defaultValue={member?.endereco?.numero ?? ''}
            />
          </FormField>
          <FormField label="Bairro" htmlFor="bairro">
            <Input id="bairro" name="bairro" defaultValue={member?.endereco?.bairro ?? ''} />
          </FormField>
          <FormField label="Cidade" htmlFor="cidade">
            <Input id="cidade" name="cidade" defaultValue={member?.endereco?.cidade ?? ''} />
          </FormField>
          <FormField label="Estado" htmlFor="estado">
            <Input
              id="estado"
              name="estado"
              maxLength={2}
              defaultValue={member?.endereco?.estado ?? ''}
            />
          </FormField>
          <FormField label="País" htmlFor="pais">
            <Input id="pais" name="pais" defaultValue={member?.endereco?.pais ?? 'Brasil'} />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Dados maçônicos</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="CIM" htmlFor="cim">
            <Input id="cim" name="cim" defaultValue={member?.cim ?? ''} />
          </FormField>
          <FormField label="Matrícula" htmlFor="matricula">
            <Input id="matricula" name="matricula" required defaultValue={member?.matricula} />
          </FormField>
          <FormField label="Grau" htmlFor="grau">
            <Select id="grau" name="grau" required defaultValue={member?.grau ?? 'aprendiz'}>
              {MEMBER_DEGREES.map((degree) => (
                <option key={degree} value={degree}>
                  {DEGREE_LABELS[degree]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data de nascimento" htmlFor="dataNascimento">
            <Input
              id="dataNascimento"
              name="dataNascimento"
              type="date"
              defaultValue={toDateInputValue(member?.dataNascimento)}
            />
          </FormField>
          <FormField label="Data de iniciação" htmlFor="dataIniciacao">
            <Input
              id="dataIniciacao"
              name="dataIniciacao"
              type="date"
              defaultValue={toDateInputValue(member?.dataIniciacao)}
            />
          </FormField>
          <FormField label="Data de elevação" htmlFor="dataElevacao">
            <Input
              id="dataElevacao"
              name="dataElevacao"
              type="date"
              defaultValue={toDateInputValue(member?.dataElevacao)}
            />
          </FormField>
          <FormField label="Data de exaltação" htmlFor="dataExaltacao">
            <Input
              id="dataExaltacao"
              name="dataExaltacao"
              type="date"
              defaultValue={toDateInputValue(member?.dataExaltacao)}
            />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Perfil</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Profissão" htmlFor="profissao">
            <Input id="profissao" name="profissao" defaultValue={member?.profissao ?? ''} />
          </FormField>
          <FormField label="Empresa" htmlFor="empresa">
            <Input id="empresa" name="empresa" defaultValue={member?.empresa ?? ''} />
          </FormField>
          <FormField label="Estado civil" htmlFor="estadoCivil">
            <Input id="estadoCivil" name="estadoCivil" defaultValue={member?.estadoCivil ?? ''} />
          </FormField>
          <FormField label="Instagram" htmlFor="instagram">
            <Input
              id="instagram"
              name="instagram"
              defaultValue={member?.redesSociais.instagram ?? ''}
            />
          </FormField>
          <FormField label="Facebook" htmlFor="facebook">
            <Input
              id="facebook"
              name="facebook"
              defaultValue={member?.redesSociais.facebook ?? ''}
            />
          </FormField>
          <FormField label="LinkedIn" htmlFor="linkedin">
            <Input
              id="linkedin"
              name="linkedin"
              defaultValue={member?.redesSociais.linkedin ?? ''}
            />
          </FormField>
        </div>
        <FormField label="Biografia" htmlFor="biografia">
          <Textarea id="biografia" name="biografia" defaultValue={member?.biografia ?? ''} />
        </FormField>
        <FormField label="Observações" htmlFor="observacoes">
          <Textarea id="observacoes" name="observacoes" defaultValue={member?.observacoes ?? ''} />
        </FormField>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
