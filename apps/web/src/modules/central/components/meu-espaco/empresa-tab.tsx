'use client';

import { useActionState, useState, type KeyboardEvent } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member, MemberCentralProfile } from '@vl6/domain';
import type { CentralBusinessEntryValues, FormaAtendimentoKey } from '@vl6/shared';
import {
  BUSINESS_PUBLICATION_STATUS_LABELS,
  FORMA_ATENDIMENTO_KEYS,
  FORMA_ATENDIMENTO_LABELS,
} from '@vl6/shared';
import {
  Badge,
  Building2,
  Button,
  Gift,
  Image as ImageIcon,
  Input,
  Switch,
  Textarea,
  X,
} from '@vl6/ui';
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
    logoUrl: null,
    produtosServicos: [],
    whatsappComercial: null,
    emailComercial: null,
    instagramComercial: null,
    formasAtendimento: [],
    horarioFuncionamento: null,
    ofereceDescontoIrmaos: false,
    descontoDescricao: null,
  };
}

function StatusBadge({ status }: { status: MemberCentralProfile['negocios'][number]['status'] }) {
  const variant =
    status === 'published' ? 'success' : status === 'suspended' ? 'destructive' : 'outline';
  return <Badge variant={variant}>{BUSINESS_PUBLICATION_STATUS_LABELS[status]}</Badge>;
}

/**
 * "O que a empresa oferece" — tags livres de produto/serviço. Não usa o
 * `TagInput` genérico (`meu-espaco/tag-input.tsx`) porque aquele grava num
 * `<input hidden>` próprio pelo `name`, um por página; aqui cada negócio do
 * array precisa do seu próprio conjunto, mantido no estado do card via
 * `updateNegocio` — a fonte da verdade é sempre `negocio.produtosServicos`.
 */
function ProdutosServicosEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const max = 8;

  function addTag() {
    const tag = draft.trim();
    if (!tag || value.length >= max || value.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="bg-accent/15 text-primary-dark flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remover ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="hover:text-primary"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {value.length < max && (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="Ex.: consultoria, manutenção, entrega expressa…"
        />
      )}
      <p className="text-muted text-xs">
        {value.length}/{max} — Enter ou vírgula para adicionar.
      </p>
    </div>
  );
}

function LogoUploader({
  negocioId,
  logoUrl,
  nomeEmpresa,
}: {
  negocioId: string;
  logoUrl: string | null;
  nomeEmpresa: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? logoUrl;

  return (
    <label
      htmlFor={`logo-${negocioId}`}
      className="border-border bg-surface hover:border-primary group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
      title="Enviar logo"
    >
      {shown ? (
        <img
          src={shown}
          alt={`Logo de ${nomeEmpresa || 'empresa'}`}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <ImageIcon size={22} className="text-muted" strokeWidth={1.5} />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:bg-black/50 group-hover:opacity-100">
        Trocar
      </span>
      <input
        id={`logo-${negocioId}`}
        name={`logo-${negocioId}`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </label>
  );
}

export function EmpresaTab({
  member,
  profile,
  knownCompanies = [],
  knownBusinessNames = [],
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  /** Empresas empregadoras já usadas no tenant — autocomplete de "Empresa atual". */
  knownCompanies?: string[];
  /** Nomes de negócio já usados no tenant — autocomplete de "Nome da empresa" de cada card. */
  knownBusinessNames?: string[];
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

  function toggleAtendimento(index: number, key: FormaAtendimentoKey) {
    setNegocios((current) =>
      current.map((n, i) => {
        if (i !== index) return n;
        const has = n.formasAtendimento.includes(key);
        return {
          ...n,
          formasAtendimento: has
            ? n.formasAtendimento.filter((k) => k !== key)
            : [...n.formasAtendimento, key],
        };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CompanyCard member={member} action={updateMyProfileAction} knownCompanies={knownCompanies} />

      <FormSectionCard
        icon={Building2}
        title="Empresas e negócios"
        description="Até 5 empresas ou negócios que você queira divulgar aos Irmãos, num formato de cartão de divulgação — logo, o que a empresa oferece e como falar com ela. Toda alteração passa por revisão da Administração antes de aparecer no Diretório de Negócios & Serviços."
      >
        <form action={contentAction} className="flex flex-col gap-4">
          <datalist id="negocios-cadastrados">
            {knownBusinessNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {negocios.map((negocio, index) => {
            const status = statusById.get(negocio.id);
            return (
              <div
                key={negocio.id}
                className="border-border bg-background flex flex-col gap-4 rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <LogoUploader
                      negocioId={negocio.id}
                      logoUrl={negocio.logoUrl}
                      nomeEmpresa={negocio.nomeEmpresa}
                    />
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                          Empresa {index + 1}
                        </span>
                        {status && <StatusBadge status={status} />}
                      </div>
                      <p className="text-muted text-xs">
                        Logo aceita JPG, PNG, WEBP, SVG ou GIF (até 5 MB).
                      </p>
                    </div>
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
                      list="negocios-cadastrados"
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
                </div>

                <FormField label="Descrição" htmlFor={`negocio-descricao-${index}`}>
                  <Textarea
                    id={`negocio-descricao-${index}`}
                    rows={2}
                    value={negocio.descricao ?? ''}
                    onChange={(e) => updateNegocio(index, { descricao: e.target.value || null })}
                  />
                </FormField>

                <FormField label="O que a empresa oferece" htmlFor={`negocio-produtos-${index}`}>
                  <ProdutosServicosEditor
                    value={negocio.produtosServicos}
                    onChange={(next) => updateNegocio(index, { produtosServicos: next })}
                  />
                </FormField>

                <div className="border-border flex flex-col gap-4 border-t pt-4">
                  <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                    Contato comercial
                  </span>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Telefone comercial" htmlFor={`negocio-telefone-${index}`}>
                      <Input
                        id={`negocio-telefone-${index}`}
                        value={negocio.telefoneComercial ?? ''}
                        onChange={(e) =>
                          updateNegocio(index, { telefoneComercial: e.target.value || null })
                        }
                      />
                    </FormField>
                    <FormField label="WhatsApp comercial" htmlFor={`negocio-whatsapp-${index}`}>
                      <Input
                        id={`negocio-whatsapp-${index}`}
                        value={negocio.whatsappComercial ?? ''}
                        onChange={(e) =>
                          updateNegocio(index, { whatsappComercial: e.target.value || null })
                        }
                      />
                    </FormField>
                    <FormField label="E-mail comercial" htmlFor={`negocio-email-${index}`}>
                      <Input
                        id={`negocio-email-${index}`}
                        type="email"
                        value={negocio.emailComercial ?? ''}
                        onChange={(e) =>
                          updateNegocio(index, { emailComercial: e.target.value || null })
                        }
                      />
                    </FormField>
                    <FormField label="Instagram do negócio" htmlFor={`negocio-instagram-${index}`}>
                      <Input
                        id={`negocio-instagram-${index}`}
                        placeholder="@usuario"
                        value={negocio.instagramComercial ?? ''}
                        onChange={(e) =>
                          updateNegocio(index, { instagramComercial: e.target.value || null })
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
                    <FormField
                      label="Horário de funcionamento"
                      htmlFor={`negocio-horario-${index}`}
                    >
                      <Input
                        id={`negocio-horario-${index}`}
                        placeholder="Ex.: seg a sex, 9h às 18h"
                        value={negocio.horarioFuncionamento ?? ''}
                        onChange={(e) =>
                          updateNegocio(index, { horarioFuncionamento: e.target.value || null })
                        }
                      />
                    </FormField>
                  </div>
                </div>

                <div className="border-border flex flex-col gap-3 border-t pt-4">
                  <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                    Como atende
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {FORMA_ATENDIMENTO_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={negocio.formasAtendimento.includes(key)}
                          onChange={() => toggleAtendimento(index, key)}
                        />
                        {FORMA_ATENDIMENTO_LABELS[key]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-border flex flex-col gap-3 border-t pt-4">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <Switch
                      checked={negocio.ofereceDescontoIrmaos}
                      onChange={(e) =>
                        updateNegocio(index, { ofereceDescontoIrmaos: e.target.checked })
                      }
                    />
                    <Gift size={16} className="text-primary" />
                    Ofereço condição especial para Irmãos
                  </label>
                  {negocio.ofereceDescontoIrmaos && (
                    <FormField label="Descreva a condição" htmlFor={`negocio-desconto-${index}`}>
                      <Input
                        id={`negocio-desconto-${index}`}
                        placeholder="Ex.: 10% de desconto para Irmãos da VL6"
                        value={negocio.descontoDescricao ?? ''}
                        onChange={(e) =>
                          updateNegocio(index, { descontoDescricao: e.target.value || null })
                        }
                      />
                    </FormField>
                  )}
                </div>
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
