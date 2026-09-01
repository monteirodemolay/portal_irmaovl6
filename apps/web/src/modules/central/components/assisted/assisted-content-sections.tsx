'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AREA_ATUACAO_KEYS, AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import type { CentralBusinessEntryValues } from '@vl6/shared';
import type { MemberCentralProfile } from '@vl6/domain';
import { Building2, Button, Input, Select, Share2, Sparkles, Textarea, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { CollapsibleSection } from '@/components/forms/collapsible-section';
import { TagInput } from '../meu-espaco/tag-input';
import {
  updateMemberCentralProfileAssistedAction,
  type AdminCentralActionState,
} from '../../actions/admin-central-actions';

function emptyNegocio(): CentralBusinessEntryValues {
  return {
    id: crypto.randomUUID(),
    nomeEmpresa: '',
    segmento: null,
    cargo: null,
    descricao: null,
    cidade: null,
    telefoneComercial: null,
    siteUrl: null,
    cnpj: null,
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

/**
 * Corpo do "Preencher perfil assistido" — cobre o conteúdo VOLUNTÁRIO da
 * Central (apresentação, atuação profissional, competências/serviços,
 * empresas e redes), sempre salvo como rascunho
 * (`UpdateMemberCentralProfileAssistedUseCase` nunca publica nada). Um único
 * `<form>` para o conjunto — diferente do "Meu Espaço" (que tem uma action
 * por card) porque aqui é a Administração preenchendo tudo de uma vez numa
 * sessão de atendimento, não o próprio Irmão navegando por abas.
 *
 * Edição de negócios aqui é deliberadamente mais simples que `EmpresaTab`
 * (sem upload de logo/busca de CNPJ) — o essencial pro cadastro assistido é
 * ter algo pra revisar depois; o Irmão sempre pode completar o resto entrando
 * no próprio "Meu Espaço" mais tarde.
 */
export function AssistedContentSections({
  memberId,
  profile,
}: {
  memberId: string;
  profile: MemberCentralProfile | null;
}) {
  const boundAction = updateMemberCentralProfileAssistedAction.bind(null, memberId);
  const [state, formAction] = useActionState<AdminCentralActionState, FormData>(boundAction, {
    error: null,
  });

  const [areaAtuacao, setAreaAtuacao] = useState<AreaAtuacaoKey | ''>(profile?.areaAtuacao ?? '');
  const [negocios, setNegocios] = useState<CentralBusinessEntryValues[]>(profile?.negocios ?? []);

  function updateNegocio(index: number, patch: Partial<CentralBusinessEntryValues>) {
    setNegocios((current) => current.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CollapsibleSection
        icon={Sparkles}
        title="Perfil para o Diretório"
        description="Apresentação, área de atuação e competências — visível quando publicado."
      >
        <FormField label="Apresentação" htmlFor="apresentacao">
          <Textarea
            id="apresentacao"
            name="apresentacao"
            maxLength={500}
            defaultValue={profile?.apresentacao ?? ''}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Área de atuação" htmlFor="areaAtuacao">
            <Select
              id="areaAtuacao"
              name="areaAtuacao"
              value={areaAtuacao}
              onChange={(event) => setAreaAtuacao(event.target.value as AreaAtuacaoKey)}
            >
              <option value="">Selecione</option>
              {AREA_ATUACAO_KEYS.map((key) => (
                <option key={key} value={key}>
                  {AREA_ATUACAO_LABELS[key]}
                </option>
              ))}
            </Select>
          </FormField>
          {areaAtuacao === 'outra' && (
            <FormField label="Qual área?" htmlFor="areaAtuacaoOutra">
              <Input
                id="areaAtuacaoOutra"
                name="areaAtuacaoOutra"
                defaultValue={profile?.areaAtuacaoOutra ?? ''}
              />
            </FormField>
          )}
          <FormField label="Formação" htmlFor="formacao">
            <Input id="formacao" name="formacao" defaultValue={profile?.formacao ?? ''} />
          </FormField>
        </div>
        <FormField label="Como pode ajudar outros Irmãos" htmlFor="resumoProfissional">
          <Textarea
            id="resumoProfissional"
            name="resumoProfissional"
            maxLength={1000}
            defaultValue={profile?.resumoProfissional ?? ''}
          />
        </FormField>
        <FormField label="Competências" htmlFor="competencias-input">
          <TagInput
            name="competencias"
            defaultValue={profile?.competencias ?? []}
            placeholder="Ex.: Negociação, Excel avançado…"
          />
        </FormField>
        <FormField label="Serviços" htmlFor="servicos-input">
          <TagInput
            name="servicos"
            defaultValue={profile?.servicos ?? []}
            placeholder="Ex.: Consultoria jurídica, Manutenção elétrica…"
          />
        </FormField>
      </CollapsibleSection>

      <CollapsibleSection
        icon={Building2}
        title="Empresas e serviços"
        description="Até 5 negócios do Irmão — toda alteração volta para revisão da Administração."
        summary={`${negocios.length}/5`}
      >
        {negocios.map((negocio, index) => (
          <div
            key={negocio.id}
            className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                Empresa {index + 1}
              </span>
              <button
                type="button"
                aria-label={`Remover empresa ${index + 1}`}
                onClick={() => setNegocios((current) => current.filter((_, i) => i !== index))}
                className="text-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <p className="text-muted text-xs">
              Logo, CNPJ e contato comercial podem ser completados depois pelo próprio Irmão em
              &ldquo;Meu Espaço&rdquo;.
            </p>
          </div>
        ))}
        {negocios.length < 5 && (
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
      </CollapsibleSection>

      <CollapsibleSection icon={Share2} title="Redes e perfis externos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="WhatsApp" htmlFor="linkWhatsapp">
            <Input
              id="linkWhatsapp"
              name="linkWhatsapp"
              defaultValue={profile?.externalLinks.whatsapp ?? ''}
            />
          </FormField>
          <FormField label="Instagram" htmlFor="linkInstagram">
            <Input
              id="linkInstagram"
              name="linkInstagram"
              defaultValue={profile?.externalLinks.instagram ?? ''}
            />
          </FormField>
          <FormField label="Facebook" htmlFor="linkFacebook">
            <Input
              id="linkFacebook"
              name="linkFacebook"
              defaultValue={profile?.externalLinks.facebook ?? ''}
            />
          </FormField>
          <FormField label="LinkedIn" htmlFor="linkLinkedin">
            <Input
              id="linkLinkedin"
              name="linkLinkedin"
              defaultValue={profile?.externalLinks.linkedin ?? ''}
            />
          </FormField>
          <FormField label="Currículo Lattes" htmlFor="linkLattes">
            <Input
              id="linkLattes"
              name="linkLattes"
              defaultValue={profile?.externalLinks.lattes ?? ''}
            />
          </FormField>
          <FormField label="Site / portfólio" htmlFor="linkSite">
            <Input id="linkSite" name="linkSite" defaultValue={profile?.externalLinks.site ?? ''} />
          </FormField>
        </div>
      </CollapsibleSection>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-fit" disabled={pending}>
      {pending ? 'Salvando rascunho…' : 'Salvar rascunho'}
    </Button>
  );
}
