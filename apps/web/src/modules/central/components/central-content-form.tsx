'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { MemberCentralProfile } from '@vl6/domain';
import {
  Briefcase,
  Building2,
  Button,
  Compass,
  Input,
  Quote,
  Share2,
  Textarea,
  UserCircle,
  X,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../actions/central-actions';

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

export function CentralContentForm({ profile }: { profile: MemberCentralProfile | null }) {
  const [state, formAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );
  const [negocios, setNegocios] = useState<NegocioDraft[]>(profile?.negocios ?? []);

  function updateNegocio(index: number, patch: Partial<NegocioDraft>) {
    setNegocios((current) => current.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-muted text-sm">
        Preencha o que quiser compartilhar com os demais Irmãos. Salvar aqui não torna nada visível
        — a visibilidade é decidida à parte, no card &ldquo;Privacidade e publicação&rdquo; abaixo.
      </p>

      <FormSectionCard
        icon={Quote}
        title="Apresentação"
        description="Uma breve descrição sobre você."
      >
        <FormField label="Sobre mim" htmlFor="apresentacao">
          <Textarea
            id="apresentacao"
            name="apresentacao"
            maxLength={500}
            defaultValue={profile?.apresentacao ?? ''}
          />
        </FormField>
      </FormSectionCard>

      <FormSectionCard icon={UserCircle} title="Informações pessoais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Interesses" htmlFor="interesses">
            <Input id="interesses" name="interesses" defaultValue={profile?.interesses ?? ''} />
          </FormField>
          <FormField label="Cidade" htmlFor="cidadeExibicao">
            <Input
              id="cidadeExibicao"
              name="cidadeExibicao"
              defaultValue={profile?.cidadeExibicao ?? ''}
            />
          </FormField>
        </div>
      </FormSectionCard>

      <FormSectionCard icon={Briefcase} title="Profissional">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Área de atuação" htmlFor="areaAtuacao">
            <Input id="areaAtuacao" name="areaAtuacao" defaultValue={profile?.areaAtuacao ?? ''} />
          </FormField>
          <FormField label="Formação" htmlFor="formacao">
            <Input id="formacao" name="formacao" defaultValue={profile?.formacao ?? ''} />
          </FormField>
        </div>
        <FormField label="Como posso ajudar" htmlFor="resumoProfissional">
          <Textarea
            id="resumoProfissional"
            name="resumoProfissional"
            maxLength={1000}
            defaultValue={profile?.resumoProfissional ?? ''}
          />
        </FormField>
      </FormSectionCard>

      <FormSectionCard
        icon={Building2}
        title="Empresa e atuação"
        description="Até 5 empresas ou negócios que você queira divulgar aos Irmãos."
      >
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
      </FormSectionCard>

      <FormSectionCard icon={Compass} title="Informações maçônicas complementares">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Lojas visitadas" htmlFor="lojasVisitadas">
            <Input
              id="lojasVisitadas"
              name="lojasVisitadas"
              defaultValue={profile?.lojasVisitadas ?? ''}
            />
          </FormField>
          <FormField label="Interesses maçônicos" htmlFor="interessesMaconicos">
            <Input
              id="interessesMaconicos"
              name="interessesMaconicos"
              defaultValue={profile?.interessesMaconicos ?? ''}
            />
          </FormField>
        </div>
      </FormSectionCard>

      <FormSectionCard icon={Share2} title="Redes e perfis externos">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="WhatsApp" htmlFor="linkWhatsapp" description="Ex.: (64) 99999-9999">
            <Input
              id="linkWhatsapp"
              name="linkWhatsapp"
              defaultValue={profile?.externalLinks.whatsapp ?? ''}
            />
          </FormField>
          <FormField label="Instagram" htmlFor="linkInstagram" description="@usuario ou URL">
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
      </FormSectionCard>

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
