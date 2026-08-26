'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member, MemberCentralProfile } from '@vl6/domain';
import type { CentralBusinessEntryValues } from '@vl6/shared';
import { BUSINESS_PUBLICATION_STATUS_LABELS } from '@vl6/shared';
import { Badge, Building2, Button, Input, Textarea, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';
import { CompanyCard } from '@/modules/membership/components/profile-fields/company-card';

const MAX_NEGOCIOS = 5;

type NegocioDraft = CentralBusinessEntryValues;

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

function StatusBadge({ status }: { status: MemberCentralProfile['negocios'][number]['status'] }) {
  const variant =
    status === 'published' ? 'success' : status === 'suspended' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{BUSINESS_PUBLICATION_STATUS_LABELS[status]}</Badge>;
}

export function EmpresaTab({
  member,
  profile,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
}) {
  const [contentState, contentAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );
  const [negocios, setNegocios] = useState<NegocioDraft[]>(profile?.negocios ?? []);
  const statusById = new Map(profile?.negocios.map((n) => [n.id, n.status]) ?? []);

  function updateNegocio(index: number, patch: Partial<NegocioDraft>) {
    setNegocios((current) => current.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  }

  return (
    <div className="flex flex-col gap-4">
      <CompanyCard member={member} action={updateMyProfileAction} />

      <FormSectionCard
        icon={Building2}
        title="Empresas e negócios"
        description="Até 5 empresas ou negócios que você queira divulgar aos Irmãos. Toda alteração passa por revisão da Administração antes de aparecer no Diretório de Negócios & Serviços."
      >
        <form action={contentAction} className="flex flex-col gap-4">
          {negocios.map((negocio, index) => {
            const status = statusById.get(negocio.id);
            return (
              <div
                key={negocio.id}
                className="border-border bg-background flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                      Empresa {index + 1}
                    </span>
                    {status && <StatusBadge status={status} />}
                  </div>
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
                  <FormField label="Cargo/função" htmlFor={`negocio-cargo-${index}`}>
                    <Input
                      id={`negocio-cargo-${index}`}
                      value={negocio.cargo ?? ''}
                      onChange={(e) => updateNegocio(index, { cargo: e.target.value || null })}
                    />
                  </FormField>
                  <FormField label="Cidade" htmlFor={`negocio-cidade-${index}`}>
                    <Input
                      id={`negocio-cidade-${index}`}
                      value={negocio.cidade ?? ''}
                      onChange={(e) => updateNegocio(index, { cidade: e.target.value || null })}
                    />
                  </FormField>
                  <FormField label="Telefone comercial" htmlFor={`negocio-telefone-${index}`}>
                    <Input
                      id={`negocio-telefone-${index}`}
                      value={negocio.telefoneComercial ?? ''}
                      onChange={(e) =>
                        updateNegocio(index, { telefoneComercial: e.target.value || null })
                      }
                    />
                  </FormField>
                  <FormField label="Site" htmlFor={`negocio-site-${index}`}>
                    <Input
                      id={`negocio-site-${index}`}
                      type="url"
                      placeholder="https://…"
                      value={negocio.siteUrl ?? ''}
                      onChange={(e) => updateNegocio(index, { siteUrl: e.target.value || null })}
                    />
                  </FormField>
                </div>
                <FormField label="Descrição" htmlFor={`negocio-descricao-${index}`}>
                  <Textarea
                    id={`negocio-descricao-${index}`}
                    rows={2}
                    value={negocio.descricao ?? ''}
                    onChange={(e) => updateNegocio(index, { descricao: e.target.value || null })}
                  />
                </FormField>
              </div>
            );
          })}
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
