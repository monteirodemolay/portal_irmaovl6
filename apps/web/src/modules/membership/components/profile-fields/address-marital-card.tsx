'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MARITAL_STATUSES, type MaritalStatus, type MemberChildValues } from '@vl6/shared';
import type { Member } from '@vl6/domain';
import { Baby, Button, Heart, Input, Select, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { MonthSelect } from '@/components/forms/month-select';
import { useCepLookup } from '@/lib/address/use-cep-lookup';
import {
  MARITAL_STATUS_LABELS,
  maritalStatusHasSpouse,
} from '@/lib/membership/marital-status-label';
import type { ProfileFieldAction, ProfileFieldActionState } from './action-state';

const MAX_FILHOS = 12;

function toDateInputValue(date: Date | null | undefined): string {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}

function emptyFilho(): MemberChildValues {
  return { id: crypto.randomUUID(), nome: '', aniversarioDia: 1, aniversarioMes: 1 };
}

/**
 * Endereço + estado civil/cônjuge — mesmo componente usado no Meu Espaço
 * (autoatendimento) e na edição administrativa de qualquer Irmão; só a
 * `action` já vinculada pelo chamador muda entre os dois.
 */
export function AddressMaritalCard({
  member,
  action,
}: {
  member: Member;
  action: ProfileFieldAction;
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(action, {
    error: null,
  });
  const [estadoCivil, setEstadoCivil] = useState<MaritalStatus | ''>(member.estadoCivil ?? '');
  const [cep, setCep] = useState(member.endereco?.cep ?? '');
  const [logradouro, setLogradouro] = useState(member.endereco?.logradouro ?? '');
  const [bairro, setBairro] = useState(member.endereco?.bairro ?? '');
  const [cidade, setCidade] = useState(member.endereco?.cidade ?? '');
  const [estado, setEstado] = useState(member.endereco?.estado ?? '');
  const [conjugeDataNascimento, setConjugeDataNascimento] = useState(
    toDateInputValue(member.conjugeDataNascimento),
  );
  const [conjugeAniversarioDia, setConjugeAniversarioDia] = useState(
    member.conjugeAniversarioDia ?? 1,
  );
  const [conjugeAniversarioMes, setConjugeAniversarioMes] = useState(
    member.conjugeAniversarioMes ?? 1,
  );
  const [dataCasamento, setDataCasamento] = useState(toDateInputValue(member.dataCasamento));
  const [filhos, setFilhos] = useState<MemberChildValues[]>(member.filhos ?? []);
  const { lookup, loading: cepLoading, error: cepError } = useCepLookup();

  function updateFilho(index: number, patch: Partial<MemberChildValues>) {
    setFilhos((current) => current.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function handleCepBlur() {
    const found = await lookup(cep);
    if (!found) return;
    setLogradouro(found.logradouro);
    setBairro(found.bairro);
    setCidade(found.cidade);
    setEstado(found.estado);
  }

  return (
    <FormSectionCard
      icon={Heart}
      title="Estado civil e endereço"
      description="Cônjuge e filhos aparecem no Perfil do Irmão (Diretório), independente de publicação. Estado civil e endereço continuam de uso interno da Secretaria."
    >
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <Input
                  id="conjugeNome"
                  name="conjugeNome"
                  defaultValue={member.conjugeNome ?? ''}
                />
              </FormField>
              <FormField label="Data de nascimento da cônjuge" htmlFor="conjugeDataNascimento">
                <Input
                  id="conjugeDataNascimento"
                  name="conjugeDataNascimento"
                  type="date"
                  value={conjugeDataNascimento}
                  onChange={(event) => setConjugeDataNascimento(event.target.value)}
                />
              </FormField>
              {!conjugeDataNascimento && (
                <>
                  <FormField
                    label="Dia do aniversário da cônjuge"
                    htmlFor="conjugeAniversarioDia"
                    description="Quando não se sabe o ano, dá pra guardar só o dia/mês."
                  >
                    <Input
                      id="conjugeAniversarioDia"
                      name="conjugeAniversarioDia"
                      type="number"
                      min={1}
                      max={31}
                      value={conjugeAniversarioDia}
                      onChange={(event) => setConjugeAniversarioDia(Number(event.target.value))}
                    />
                  </FormField>
                  <FormField label="Mês do aniversário da cônjuge" htmlFor="conjugeAniversarioMes">
                    <MonthSelect
                      id="conjugeAniversarioMes"
                      name="conjugeAniversarioMes"
                      value={conjugeAniversarioMes}
                      onChange={setConjugeAniversarioMes}
                    />
                  </FormField>
                </>
              )}
              <FormField label="Data de casamento" htmlFor="dataCasamento">
                <Input
                  id="dataCasamento"
                  name="dataCasamento"
                  type="date"
                  value={dataCasamento}
                  onChange={(event) => setDataCasamento(event.target.value)}
                />
              </FormField>
            </>
          )}
        </div>

        {/*
          Fora do `maritalStatusHasSpouse` de propósito — filhos existem
          independente do estado civil ATUAL do Irmão (solteiro, viúvo ou
          divorciado também podem ter filhos cadastrados), diferente de
          cônjuge/data de casamento, que só fazem sentido junto de um
          relacionamento em curso. Antes ficava preso ao mesmo bloco e
          zerava a possibilidade de cadastrar filhos pra quem não estava
          casado/em união estável (bug relatado pelo Administrador).
        */}
        <div className="border-border-soft flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <Baby size={16} strokeWidth={1.75} className="text-muted" />
            <p className="text-sm font-medium">Filhos</p>
          </div>
          <p className="text-muted -mt-1 text-xs">
            Só dia/mês do aniversário — sem o ano, mesmo motivo da cônjuge acima.
          </p>
          {filhos.map((filho, index) => (
            <div key={filho.id} className="flex items-end gap-3">
              <div className="flex-1">
                <FormField label="Nome" htmlFor={`filho-nome-${index}`}>
                  <Input
                    id={`filho-nome-${index}`}
                    value={filho.nome}
                    onChange={(event) => updateFilho(index, { nome: event.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Dia" htmlFor={`filho-dia-${index}`}>
                <Input
                  id={`filho-dia-${index}`}
                  type="number"
                  min={1}
                  max={31}
                  className="w-20"
                  value={filho.aniversarioDia}
                  onChange={(event) =>
                    updateFilho(index, { aniversarioDia: Number(event.target.value) })
                  }
                />
              </FormField>
              <FormField label="Mês" htmlFor={`filho-mes-${index}`}>
                <div className="w-36">
                  <MonthSelect
                    id={`filho-mes-${index}`}
                    value={filho.aniversarioMes}
                    onChange={(mes) => updateFilho(index, { aniversarioMes: mes })}
                  />
                </div>
              </FormField>
              <button
                type="button"
                aria-label={`Remover ${filho.nome || 'filho(a)'}`}
                onClick={() => setFilhos((current) => current.filter((_, i) => i !== index))}
                className="text-muted hover:text-foreground hover:bg-background mb-1.5 rounded-full p-2 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {filhos.length < MAX_FILHOS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setFilhos((current) => [...current, emptyFilho()])}
            >
              Adicionar filho(a)
            </Button>
          )}
          <input type="hidden" name="filhos" value={JSON.stringify(filhos)} />
        </div>

        <div className="border-border-soft grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Input
              id="enderecoNumero"
              name="enderecoNumero"
              defaultValue={member.endereco?.numero ?? ''}
            />
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
