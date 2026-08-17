'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MARITAL_STATUSES, MEMBER_DEGREES, type MaritalStatus } from '@vl6/shared';
import type { Role } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import {
  MARITAL_STATUS_LABELS,
  maritalStatusHasSpouse,
} from '@/lib/membership/marital-status-label';
import { useCepLookup } from '@/lib/address/use-cep-lookup';
import { COMMON_PROFESSIONS, OTHER_PROFESSION_VALUE } from '@/lib/membership/professions';
import type { MemberActionState } from '../actions/member-actions';

export interface NewMemberFormProps {
  action: (state: MemberActionState, formData: FormData) => Promise<MemberActionState>;
  roles: Role[];
  /** Profissões já usadas no tenant que não estão na lista pré-definida. */
  customProfessions?: string[];
}

function PhotoField({ nome }: { nome: string }) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-4">
      <MemberAvatar fotoUrl={preview} nome={nome || 'Irmão'} className="h-16 w-16" />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="foto"
          className="text-primary w-fit cursor-pointer text-sm font-medium hover:underline"
        >
          Selecionar foto
        </label>
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        <p className="text-muted text-xs">JPG, PNG ou WEBP — até 5 MB.</p>
      </div>
    </div>
  );
}

/**
 * Cadastro de um novo Irmão — formulário único cobrindo todos os campos de
 * uma vez, sem equivalente de autoatendimento (um Irmão que ainda não
 * existe não tem como editar o próprio cadastro). A edição de um Irmão já
 * cadastrado usa os cartões de `profile-fields/`/`admin-only/`
 * (`/admin/pessoas/irmaos/[memberId]`), reaproveitados também pelo próprio
 * Irmão no Meu Espaço.
 */
export function NewMemberForm({ action, roles, customProfessions = [] }: NewMemberFormProps) {
  const [state, formAction] = useActionState<MemberActionState, FormData>(action, {
    error: null,
    memberId: null,
    temporaryPassword: null,
  });
  const defaultRoleId = roles.find((r) => r.chave === 'membro')?.id ?? roles[0]?.id;
  const [grau, setGrau] = useState('aprendiz' as (typeof MEMBER_DEGREES)[number]);
  const [estadoCivil, setEstadoCivil] = useState<MaritalStatus | ''>('');
  const [email, setEmail] = useState('');
  const [criarAcesso, setCriarAcesso] = useState(true);
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const { lookup, loading: cepLoading, error: cepError } = useCepLookup();

  async function handleCepBlur() {
    const found = await lookup(cep);
    if (!found) return;
    setLogradouro(found.logradouro);
    setBairro(found.bairro);
    setCidade(found.cidade);
    setEstado(found.estado);
  }

  const professionOptions = [...COMMON_PROFESSIONS, ...customProfessions];
  const [profissaoSelect, setProfissaoSelect] = useState('');

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
              href={`/admin/pessoas/irmaos/${state.memberId}`}
              className="text-accent w-fit text-sm font-medium hover:underline"
            >
              Ver cadastro do Irmão
            </Link>
          )}
        </div>
      )}

      {!state.error && !state.temporaryPassword && state.memberId && (
        <div className="border-accent/40 bg-accent/10 flex flex-col gap-2 rounded border p-4 text-sm">
          <p>
            Irmão cadastrado sem acesso ao Portal. Ative o acesso quando quiser, pela tela do Irmão.
          </p>
          <Link
            href={`/admin/pessoas/irmaos/${state.memberId}`}
            className="text-accent w-fit text-sm font-medium hover:underline"
          >
            Ver cadastro do Irmão
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Identificação</h2>
        <PhotoField nome="" />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nome completo" htmlFor="nomeCompleto">
            <Input id="nomeCompleto" name="nomeCompleto" required />
          </FormField>
          <FormField
            label="E-mail"
            htmlFor="email"
            description="Opcional — sem e-mail, o Irmão pode reivindicar o próprio acesso depois."
          >
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
          <FormField label="Telefone" htmlFor="telefone">
            <Input id="telefone" name="telefone" />
          </FormField>
          <FormField label="WhatsApp" htmlFor="whatsapp">
            <Input id="whatsapp" name="whatsapp" />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Endereço</h2>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="CEP"
            htmlFor="cep"
            description={cepLoading ? 'Consultando…' : (cepError ?? undefined)}
          >
            <Input
              id="cep"
              name="cep"
              value={cep}
              onChange={(event) => setCep(event.target.value)}
              onBlur={handleCepBlur}
            />
          </FormField>
          <FormField label="Logradouro" htmlFor="logradouro">
            <Input
              id="logradouro"
              name="logradouro"
              value={logradouro}
              onChange={(event) => setLogradouro(event.target.value)}
            />
          </FormField>
          <FormField label="Número" htmlFor="enderecoNumero">
            <Input id="enderecoNumero" name="enderecoNumero" />
          </FormField>
          <FormField label="Bairro" htmlFor="bairro">
            <Input
              id="bairro"
              name="bairro"
              value={bairro}
              onChange={(event) => setBairro(event.target.value)}
            />
          </FormField>
          <FormField label="Cidade" htmlFor="cidade">
            <Input
              id="cidade"
              name="cidade"
              value={cidade}
              onChange={(event) => setCidade(event.target.value)}
            />
          </FormField>
          <FormField label="Estado" htmlFor="estado">
            <Input
              id="estado"
              name="estado"
              maxLength={2}
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
            />
          </FormField>
          <FormField label="País" htmlFor="pais">
            <Input id="pais" name="pais" defaultValue="Brasil" />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Dados maçônicos</h2>
          <p className="text-muted text-xs">
            Opcional — pode ser preenchido depois, quando você tiver os dados em mãos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="CIM" htmlFor="cim">
            <Input id="cim" name="cim" />
          </FormField>
          <FormField label="Grau" htmlFor="grau">
            <Select
              id="grau"
              name="grau"
              required
              value={grau}
              onChange={(event) => setGrau(event.target.value as typeof grau)}
            >
              {MEMBER_DEGREES.map((degree) => (
                <option key={degree} value={degree}>
                  {MEMBER_DEGREE_LABELS[degree]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Data de nascimento" htmlFor="dataNascimento">
            <Input id="dataNascimento" name="dataNascimento" type="date" />
          </FormField>
          <FormField label="Data de iniciação" htmlFor="dataIniciacao">
            <Input id="dataIniciacao" name="dataIniciacao" type="date" />
          </FormField>
          <FormField label="Data de elevação" htmlFor="dataElevacao">
            <Input id="dataElevacao" name="dataElevacao" type="date" />
          </FormField>
          <FormField label="Data de exaltação" htmlFor="dataExaltacao">
            <Input id="dataExaltacao" name="dataExaltacao" type="date" />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Perfil</h2>
        <div className="grid grid-cols-2 gap-4">
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
              <Input id="profissaoOutra" name="profissaoOutra" />
            </FormField>
          )}
          <FormField label="Empresa" htmlFor="empresa">
            <Input id="empresa" name="empresa" />
          </FormField>
          <FormField label="Estado civil" htmlFor="estadoCivil">
            <Select
              id="estadoCivil"
              name="estadoCivil"
              value={estadoCivil}
              onChange={(event) => setEstadoCivil(event.target.value as MaritalStatus)}
            >
              <option value="">Selecione</option>
              {MARITAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MARITAL_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </FormField>
          {maritalStatusHasSpouse(estadoCivil || null) && (
            <>
              <FormField label="Nome da cônjuge" htmlFor="conjugeNome">
                <Input id="conjugeNome" name="conjugeNome" />
              </FormField>
              <FormField label="Data de nascimento da cônjuge" htmlFor="conjugeDataNascimento">
                <Input id="conjugeDataNascimento" name="conjugeDataNascimento" type="date" />
              </FormField>
            </>
          )}
          <FormField label="Instagram" htmlFor="instagram">
            <Input id="instagram" name="instagram" />
          </FormField>
          <FormField label="Facebook" htmlFor="facebook">
            <Input id="facebook" name="facebook" />
          </FormField>
          <FormField label="LinkedIn" htmlFor="linkedin">
            <Input id="linkedin" name="linkedin" />
          </FormField>
        </div>
        <FormField label="Biografia" htmlFor="biografia">
          <Textarea id="biografia" name="biografia" />
        </FormField>
        <FormField label="Observações" htmlFor="observacoes">
          <Textarea id="observacoes" name="observacoes" />
        </FormField>
      </section>

      {roles.length > 0 && (
        <section className="border-border flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="font-display text-lg font-semibold">Acesso ao Portal</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="criarAcesso"
              checked={criarAcesso && Boolean(email.trim())}
              disabled={!email.trim()}
              onChange={(event) => setCriarAcesso(event.target.checked)}
              className="accent-primary h-4 w-4 disabled:opacity-50"
            />
            Criar acesso ao Portal para este Irmão
          </label>
          {!email.trim() && (
            <p className="text-muted text-xs">
              Preencha o e-mail em Identificação pra poder criar o acesso agora — ou deixe em branco
              e o próprio Irmão reivindica o acesso depois.
            </p>
          )}
          <FormField label="Perfil de acesso" htmlFor="roleId">
            <Select id="roleId" name="roleId" defaultValue={defaultRoleId} disabled={!email.trim()}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <p className="text-muted text-xs">
            O usuário de acesso é o próprio e-mail do Irmão; a senha inicial é gerada
            automaticamente e mostrada uma única vez após salvar.
          </p>
        </section>
      )}

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
