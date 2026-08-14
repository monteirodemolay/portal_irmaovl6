'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member, MemberCentralProfile } from '@vl6/domain';
import { Building2, Button, Input, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import {
  updateMyProfileAction,
  type SelfProfileActionState,
} from '@/modules/membership/actions/self-profile-actions';

const MAX_NEGOCIOS = 5;

type NegocioDraft = MemberCentralProfile['negocios'][number];

function emptyNegocio(): NegocioDraft {
  return {
    id: crypto.randomUUID(),
    nomeEmpresa: '',
    segmento: null,
    cargo: null,
    descricao: null,
    cidade: null,
    telefoneComercial: null,
    siteUrl: null,
  };
}

export function EmpresaTab({
  member,
  profile,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
}) {
  const [selfState, selfAction] = useActionState<SelfProfileActionState, FormData>(
    updateMyProfileAction,
    { error: null },
  );
  const [contentState, contentAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );
  const [negocios, setNegocios] = useState<NegocioDraft[]>(profile?.negocios ?? []);

  function updateNegocio(index: number, patch: Partial<NegocioDraft>) {
    setNegocios((current) => current.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  }

  return (
    <div className="flex flex-col gap-4">
      <FormSectionCard icon={Building2} title="Empresa atual">
        <form action={selfAction} className="flex flex-col gap-4">
          <FormField label="Empresa" htmlFor="empresa">
            <Input id="empresa" name="empresa" defaultValue={member.empresa ?? ''} />
          </FormField>
          {selfState.error && <p className="text-sm text-red-600">{selfState.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>

      <FormSectionCard
        icon={Building2}
        title="Empresas e negócios"
        description="Até 5 empresas ou negócios que você queira divulgar aos Irmãos."
      >
        <form action={contentAction} className="flex flex-col gap-4">
          {negocios.map((negocio, index) => (
            <div
              key={negocio.id}
              className="border-border bg-background flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Empresa {index + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Remover empresa ${index + 1}`}
                  onClick={() => setNegocios((current) => current.filter((_, i) => i !== index))}
                  className="text-muted hover:text-foreground hover:bg-surface rounded-full p-1 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Nome da empresa" htmlFor={`negocio-nome-${index}`}>
                  <Input
                    id={`negocio-nome-${index}`}
                    value={negocio.nomeEmpresa}
                    onChange={(e) => updateNegocio(index, { nomeEmpresa: e.target.value })}
                  />
                </FormField>
                <FormField label="Segmento" htmlFor={`negocio-segmento-${index}`}>
                  <Input
                    id={`negocio-segmento-${index}`}
                    value={negocio.segmento ?? ''}
                    onChange={(e) => updateNegocio(index, { segmento: e.target.value || null })}
                  />
                </FormField>
              </div>
            </div>
          ))}
          {negocios.length < MAX_NEGOCIOS && (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => setNegocios((current) => [...current, emptyNegocio()])}
            >
              Adicionar empresa
            </Button>
          )}
          <input type="hidden" name="negocios" value={JSON.stringify(negocios)} />
          {contentState.error && <p className="text-sm text-red-600">{contentState.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>
    </div>
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
